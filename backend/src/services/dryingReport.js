const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const db = require('../db/schema');
const apexDocuments = require('../db/apexDocuments');
const { v4: uuidv4 } = require('uuid');

// Constants
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'drying-report');
const REPORTS_DIR = '/data/uploads/reports';

// Material code to display name mapping
const MATERIAL_NAMES = {
  'concrete': 'Concrete',
  'drywall': 'Drywall',
  'wood': 'Wood',
  'carpet': 'Carpet',
  'tile': 'Tile/Ceramic',
  'vinyl': 'Vinyl/LVT',
  'hardwood': 'Hardwood',
  'insulation': 'Insulation',
  'other': 'Other'
};

/**
 * Calculate equipment billing periods (24-hour blocks)
 */
function calculateBillingPeriods(placedAt, removedAt) {
  const start = new Date(placedAt);
  const end = new Date(removedAt);
  const hoursDeployed = (end - start) / (1000 * 60 * 60);
  return Math.ceil(hoursDeployed / 24); // each 24-hour block = 1 billing period
}

/**
 * Generate equipment daily log for a room
 */
function generateEquipmentDailyLog(equipmentPlacements) {
  if (!equipmentPlacements.length) return [];

  // Find date range
  let earliestDate = new Date(equipmentPlacements[0].placed_at);
  let latestDate = new Date();

  equipmentPlacements.forEach(eq => {
    const placedDate = new Date(eq.placed_at);
    const removedDate = eq.removed_at ? new Date(eq.removed_at) : new Date();
    
    if (placedDate < earliestDate) earliestDate = placedDate;
    if (removedDate > latestDate) latestDate = removedDate;
  });

  const dailyLog = [];
  const currentDate = new Date(earliestDate);
  currentDate.setHours(0, 0, 0, 0);

  while (currentDate <= latestDate) {
    const dayStart = new Date(currentDate);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    const counts = {
      dehumidifiers: 0,
      air_movers: 0,
      air_scrubbers: 0,
      other_equipment: 0
    };

    // Count active equipment for this date
    equipmentPlacements.forEach(eq => {
      const placedAt = new Date(eq.placed_at);
      const removedAt = eq.removed_at ? new Date(eq.removed_at) : null;

      // Equipment is active if placed_at <= end_of_day AND (removed_at IS NULL OR removed_at > start_of_day)
      if (placedAt <= dayEnd && (!removedAt || removedAt > dayStart)) {
        switch (eq.equipment_type) {
          case 'dehumidifier':
            counts.dehumidifiers++;
            break;
          case 'air_mover':
            counts.air_movers++;
            break;
          case 'air_scrubber':
            counts.air_scrubbers++;
            break;
          default:
            counts.other_equipment++;
            break;
        }
      }
    });

    const totalUnits = counts.dehumidifiers + counts.air_movers + counts.air_scrubbers + counts.other_equipment;
    
    if (totalUnits > 0) {
      dailyLog.push({
        date: currentDate.toISOString().slice(0, 10),
        dehumidifiers: counts.dehumidifiers,
        air_movers: counts.air_movers,
        air_scrubbers: counts.air_scrubbers,
        other_equipment: counts.other_equipment,
        total_units: totalUnits
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dailyLog;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Calculate days between two dates
 */
function calculateDaysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * Gather all data needed for the report
 */
async function gatherReportData(logId, jobId, orgId) {
  // Get job info
  const job = await db.getOne(`
    SELECT aj.*, ao.name as company_name 
    FROM apex_jobs aj 
    LEFT JOIN apex_organizations ao ON aj.org_id = ao.id 
    WHERE aj.id = $1 AND aj.org_id = $2
  `, [jobId, orgId]);

  if (!job) {
    throw new Error('Job not found');
  }

  // Get drying log
  const dryingLog = await db.getOne('SELECT * FROM drying_logs WHERE id = $1', [logId]);
  if (!dryingLog) {
    throw new Error('Drying log not found');
  }

  // Get chambers with floor_level
  const chambers = await db.getAll(
    'SELECT * FROM drying_chambers WHERE log_id = $1 ORDER BY position',
    [logId]
  );

  // Get rooms per chamber
  const rooms = await db.getAll(`
    SELECT r.*, c.name as chamber_name, c.floor_level as chamber_floor_level
    FROM drying_rooms r
    JOIN drying_chambers c ON r.chamber_id = c.id
    WHERE c.log_id = $1
    ORDER BY c.position, r.position
  `, [logId]);

  // Get visits
  const visits = await db.getAll(
    'SELECT * FROM drying_visits WHERE log_id = $1 ORDER BY visit_number',
    [logId]
  );

  // Get atmospheric readings per visit per chamber
  const atmosphericReadings = await db.getAll(`
    SELECT ar.*, v.visit_number, v.visited_at, c.name as chamber_name
    FROM drying_atmospheric_readings ar
    JOIN drying_visits v ON ar.visit_id = v.id
    LEFT JOIN drying_chambers c ON ar.chamber_id = c.id
    WHERE v.log_id = $1
    ORDER BY v.visit_number, c.position
  `, [logId]);

  // Get reference points with all moisture readings
  const refPoints = await db.getAll(`
    SELECT rp.*, r.name as room_name, c.name as chamber_name
    FROM drying_ref_points rp
    JOIN drying_rooms r ON rp.room_id = r.id
    JOIN drying_chambers c ON r.chamber_id = c.id
    WHERE rp.log_id = $1
    ORDER BY c.position, r.position, rp.ref_number
  `, [logId]);

  // Get moisture readings for all ref points
  const moistureReadings = await db.getAll(`
    SELECT mr.*, v.visit_number, v.visited_at
    FROM drying_moisture_readings mr
    JOIN drying_visits v ON mr.visit_id = v.id
    WHERE v.log_id = $1
    ORDER BY v.visit_number
  `, [logId]);

  // Get baselines
  const baselines = await db.getAll(
    'SELECT * FROM drying_baselines WHERE log_id = $1',
    [logId]
  );

  // Get equipment placements
  const equipmentPlacements = await db.getAll(`
    SELECT ep.*, r.name as room_name, c.name as chamber_name
    FROM drying_equipment_placements ep
    JOIN drying_rooms r ON ep.room_id = r.id
    JOIN drying_chambers c ON r.chamber_id = c.id
    WHERE ep.drying_log_id = $1
    ORDER BY ep.placed_at
  `, [logId]);

  // Get visit notes
  const visitNotes = await db.getAll(`
    SELECT vn.*, v.visit_number, v.visited_at
    FROM drying_visit_notes vn
    JOIN drying_visits v ON vn.visit_id = v.id
    WHERE v.log_id = $1
    ORDER BY v.visit_number
  `, [logId]);

  return {
    job,
    dryingLog,
    chambers,
    rooms,
    visits,
    atmosphericReadings,
    refPoints,
    moistureReadings,
    baselines,
    equipmentPlacements,
    visitNotes
  };
}

/**
 * Build atmospheric readings table HTML for a chamber
 */
function buildAtmosphericTable(readings, visits) {
  if (!readings.length) {
    return '<tr><td colspan="6" class="no-data">No atmospheric readings recorded</td></tr>';
  }

  return readings.map(reading => {
    const visit = visits.find(v => v.id === reading.visit_id);
    const visitDate = visit ? formatDate(visit.visited_at) : '';
    
    // Calculate grain depression (difference from ambient)
    const ambientReading = readings.find(r => 
      r.visit_id === reading.visit_id && r.reading_type === 'ambient'
    );
    const grainDepression = ambientReading && reading.reading_type !== 'ambient' ? 
      (ambientReading.gpp - reading.gpp).toFixed(1) : '';

    const status = reading.reading_type === 'ambient' ? 'Ambient' : 
                  grainDepression && parseFloat(grainDepression) > 0 ? 'Drying' : 'Monitoring';

    return `
      <tr>
        <td>${visitDate}</td>
        <td>${reading.temp_f || ''}</td>
        <td>${reading.rh_percent || ''}%</td>
        <td>${reading.gpp || ''}</td>
        <td>${grainDepression}</td>
        <td class="status-${status.toLowerCase()}">${status}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Build reference points readings matrix for a room
 */
function buildRefPointsMatrix(roomRefPoints, moistureReadings, visits, baselines) {
  if (!roomRefPoints.length) {
    return '<tr><td colspan="4" class="no-data">No reference points in this room</td></tr>';
  }

  // Get unique visit dates
  const visitDates = visits.map(v => ({
    id: v.id,
    date: formatDate(v.visited_at),
    number: v.visit_number
  }));

  let html = '';

  roomRefPoints.forEach(refPoint => {
    const pointReadings = moistureReadings.filter(mr => mr.ref_point_id === refPoint.id);
    const baseline = baselines.find(b => b.material_code === refPoint.material_code);
    const dryStandard = baseline ? baseline.baseline_value + 4 : 'N/A';

    // Check if point meets dry standard on last reading
    const lastReading = pointReadings.length > 0 ? 
      pointReadings[pointReadings.length - 1] : null;
    const isDry = lastReading && baseline ? 
      lastReading.reading_value <= (baseline.baseline_value + 4) : false;
    const isDemolished = refPoint.demolished_at !== null;

    let status = 'wet';
    let statusText = 'Wet';
    if (isDemolished) {
      status = 'demolished';
      statusText = 'Demolished';
    } else if (isDry) {
      status = 'dry';
      statusText = 'Dry';
    }

    html += `
      <tr>
        <td class="point-name">
          ${refPoint.ref_number} - ${MATERIAL_NAMES[refPoint.material_code] || refPoint.material_code}
          ${refPoint.label ? ` (${refPoint.label})` : ''}
        </td>
    `;

    // Add reading cells for each visit
    visitDates.forEach(visit => {
      const reading = pointReadings.find(mr => mr.visit_id === visit.id);
      const readingValue = reading ? reading.reading_value : '';
      const readingClass = reading && baseline ? 
        (reading.reading_value <= (baseline.baseline_value + 4) ? 'reading-dry' : 'reading-wet') : '';
      
      html += `<td class="reading ${readingClass}">${readingValue}</td>`;
    });

    html += `
        <td class="dry-standard">${dryStandard}</td>
        <td class="status-cell">
          <span class="status-badge ${status}">${statusText}</span>
        </td>
      </tr>
    `;
  });

  return html;
}

/**
 * Build equipment daily log table for a room
 */
function buildEquipmentLogTable(roomEquipment) {
  if (!roomEquipment.length) {
    return '<tr><td colspan="6" class="no-data">No equipment deployed in this room</td></tr>';
  }

  const dailyLog = generateEquipmentDailyLog(roomEquipment);
  
  if (!dailyLog.length) {
    return '<tr><td colspan="6" class="no-data">No equipment activity recorded</td></tr>';
  }

  return dailyLog.map(day => `
    <tr>
      <td>${formatDate(day.date)}</td>
      <td class="equipment-count">${day.dehumidifiers}</td>
      <td class="equipment-count">${day.air_movers}</td>
      <td class="equipment-count">${day.air_scrubbers}</td>
      <td class="equipment-count">${day.other_equipment}</td>
      <td class="equipment-count equipment-total">${day.total_units}</td>
    </tr>
  `).join('');
}

/**
 * Build equipment summary table
 */
function buildEquipmentSummaryTable(equipmentPlacements) {
  if (!equipmentPlacements.length) {
    return '<p>No equipment deployed for this job.</p>';
  }

  // Group equipment by type and calculate billing
  const equipmentSummary = {};
  
  equipmentPlacements.forEach(eq => {
    if (!eq.removed_at) return; // Skip active equipment
    
    const type = eq.equipment_type;
    if (!equipmentSummary[type]) {
      equipmentSummary[type] = {
        type: type,
        totalUnits: 0,
        totalBillingPeriods: 0,
        placements: []
      };
    }
    
    const billingPeriods = calculateBillingPeriods(eq.placed_at, eq.removed_at);
    equipmentSummary[type].totalUnits++;
    equipmentSummary[type].totalBillingPeriods += billingPeriods;
    equipmentSummary[type].placements.push({
      ...eq,
      billingPeriods
    });
  });

  if (Object.keys(equipmentSummary).length === 0) {
    return '<p>No completed equipment deployments to summarize.</p>';
  }

  let html = `
    <table class="equipment-summary-table">
      <thead>
        <tr>
          <th>Equipment Type</th>
          <th>Total Units Used</th>
          <th>Total Billing Periods</th>
          <th>Average Days per Unit</th>
        </tr>
      </thead>
      <tbody>
  `;

  Object.values(equipmentSummary).forEach(summary => {
    const avgDays = summary.totalUnits > 0 ? 
      (summary.totalBillingPeriods / summary.totalUnits).toFixed(1) : '0';
    
    const typeDisplay = summary.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    html += `
      <tr>
        <td>${typeDisplay}</td>
        <td>${summary.totalUnits}</td>
        <td>${summary.totalBillingPeriods}</td>
        <td>${avgDays}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
}

/**
 * Build visit notes section
 */
function buildVisitNotesSection(visitNotes, visits) {
  if (!visitNotes.length) {
    return '<h2>Visit Notes</h2><p>No visit notes recorded.</p>';
  }

  let html = '<h2>Visit Notes</h2>';

  visitNotes.forEach(note => {
    const visit = visits.find(v => v.id === note.visit_id);
    const visitInfo = visit ? 
      `Visit #${visit.visit_number} - ${formatDate(visit.visited_at)}` : 
      'Unknown Visit';

    html += `
      <div class="visit-note">
        <h4 class="visit-note-header">${visitInfo}</h4>
        <div class="visit-note-content">${note.content || ''}</div>
      </div>
    `;
  });

  return html;
}

/**
 * Render HTML template with data
 */
function renderTemplate(templatePath, data) {
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  
  return templateContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Generate PDF from HTML
 */
async function htmlToPdf(html, cssPath) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    
    // Read CSS and inline it
    const css = fs.readFileSync(cssPath, 'utf8');
    const fullHtml = html.replace('</head>', `<style>${css}</style></head>`);
    
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { 
        top: '0.75in', 
        right: '0.75in', 
        bottom: '0.75in', 
        left: '0.75in' 
      }
    });
    
    return pdf;
  } finally {
    await browser.close();
  }
}

/**
 * Main generate function
 */
async function generate(logId, jobId, orgId, userId) {
  try {
    // Gather all data
    const data = await gatherReportData(logId, jobId, orgId);
    
    // Calculate derived data
    const mitigationStart = data.dryingLog.created_at;
    const completionDate = data.dryingLog.completed_at;
    const totalDryingDays = calculateDaysBetween(mitigationStart, completionDate);
    
    // Prepare template variables
    const templateData = {
      // Company info
      company_name: data.job.company_name || 'Apex Restoration',
      company_logo: '/data/uploads/logos/company-logo.png', // Default path
      
      // Job info  
      client_name: data.job.client_name || '',
      property_address: `${data.job.prop_street || ''} ${data.job.prop_city || ''} ${data.job.prop_state || ''} ${data.job.prop_zip || ''}`.trim(),
      insurance_carrier: data.job.ins_carrier || '',
      claim_number: data.job.ins_claim || '',
      policy_number: data.job.ins_policy || '',
      adjuster_name: data.job.adj_name || '',
      adjuster_phone: data.job.adj_phone || '',
      adjuster_email: data.job.adj_email || '',
      
      // Dates
      date_of_loss: formatDate(data.job.loss_date),
      mitigation_start: formatDate(mitigationStart),
      completion_date: formatDate(completionDate),
      total_drying_days: totalDryingDays,
      report_date: formatDate(new Date().toISOString())
    };

    // Build chamber sections
    let chamberSections = '';
    
    for (const chamber of data.chambers) {
      const chamberRooms = data.rooms.filter(r => r.chamber_id === chamber.id);
      const chamberAtmospheric = data.atmosphericReadings.filter(
        ar => ar.chamber_id === chamber.id || ar.reading_type === 'ambient'
      );
      
      // Build atmospheric table
      const atmosphericTable = buildAtmosphericTable(chamberAtmospheric, data.visits);
      
      // Build room sections
      let roomSections = '';
      for (const room of chamberRooms) {
        const roomRefPoints = data.refPoints.filter(rp => rp.room_id === room.id);
        const roomEquipment = data.equipmentPlacements.filter(ep => ep.room_id === room.id);
        
        // Get visit dates for matrix headers
        const visitDates = data.visits.map(v => formatDate(v.visited_at));
        
        // Build reference points matrix
        const refPointsMatrix = buildRefPointsMatrix(
          roomRefPoints, 
          data.moistureReadings, 
          data.visits, 
          data.baselines
        );
        
        // Build equipment log
        const equipmentLogTable = buildEquipmentLogTable(roomEquipment);
        
        const roomData = {
          room_name: room.name || 'Unnamed Room',
          visit_dates: visitDates.map(date => `<th>${date}</th>`).join(''),
          reference_points: refPointsMatrix,
          equipment_days: equipmentLogTable
        };
        
        roomSections += renderTemplate(
          path.join(TEMPLATES_DIR, 'room-section.html'),
          roomData
        );
      }
      
      const chamberData = {
        chamber_name: chamber.name || 'Default Chamber',
        floor_level: chamber.floor_level || 'Main Level',
        atmospheric_table: atmosphericTable,
        room_sections: roomSections
      };
      
      chamberSections += renderTemplate(
        path.join(TEMPLATES_DIR, 'chamber-section.html'),
        chamberData
      );
    }
    
    // Build equipment summary
    const equipmentSummaryTable = buildEquipmentSummaryTable(data.equipmentPlacements);
    
    // Build visit notes section
    const visitNotesSection = buildVisitNotesSection(data.visitNotes, data.visits);
    
    // Complete template data
    templateData.chamber_sections = chamberSections;
    templateData.equipment_summary_table = equipmentSummaryTable;
    templateData.visit_notes_section = visitNotesSection;
    
    // Render main template
    const html = renderTemplate(
      path.join(TEMPLATES_DIR, 'report.html'),
      templateData
    );
    
    // Generate PDF
    const pdf = await htmlToPdf(html, path.join(TEMPLATES_DIR, 'report.css'));
    
    // Save PDF to disk
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const fileName = `drying-report-${jobId}-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    fs.writeFileSync(filePath, pdf);
    
    // Insert into drying_reports table
    const reportId = uuidv4();
    await db.run(`
      INSERT INTO drying_reports (id, drying_log_id, job_id, org_id, filename, file_path, file_size, generated_by, generated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [reportId, logId, jobId, orgId, fileName, filePath, pdf.length, userId]);
    
    // Insert into apex_documents table
    await apexDocuments.createDocument({
      orgId: orgId,
      jobId: jobId,
      phaseId: null,
      entityType: 'drying_log',
      entityId: logId,
      documentType: 'drying_report',
      title: `Drying Report - ${data.job.client_name}`,
      fileName: fileName,
      filePath: filePath,
      fileSize: pdf.length,
      mimeType: 'application/pdf',
      description: `Drying report generated on ${formatDate(new Date().toISOString())}`,
      uploadedBy: userId
    });
    
    return {
      success: true,
      reportId: reportId,
      fileName: fileName,
      fileSize: pdf.length
    };
    
  } catch (error) {
    console.error('Error generating drying report:', error);
    throw error;
  }
}

/**
 * List reports for a drying log
 */
async function listReports(logId) {
  return await db.getAll(
    'SELECT * FROM drying_reports WHERE drying_log_id = $1 ORDER BY generated_at DESC',
    [logId]
  );
}

module.exports = {
  generate,
  listReports,
  calculateBillingPeriods
};