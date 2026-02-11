/**
 * New Job Modal - Wide Grid Layout
 * Phase B: Full form fields with Same toggle logic
 * Phase C: Job Type Selection with multi-select
 */

const jobModal = {
    el: null,
    form: null,
    sameToggle: null,
    propertyFields: null,
    isSameAsClient: false,
    submitBtn: null,
    clientNameInput: null,
    initialized: false,
    
    // Job type selection state
    selectedJobTypes: new Set(),
    jobTypeButtons: null,

    // Additional contact counters
    additionalClientCount: 0,
    additionalAdjusterCount: 0,
    additionalSiteContactCount: 0,

    // Field mappings for "Same as Client" sync
    fieldMappings: [
        { client: "job-client-street", prop: "job-prop-street" },
        { client: "job-client-city", prop: "job-prop-city" },
        { client: "job-client-state", prop: "job-prop-state" },
        { client: "job-client-zip", prop: "job-prop-zip" }
    ],
    
    // Job type definitions
    jobTypes: {
        mitigation: { name: "Mitigation", code: "MIT" },
        reconstruction: { name: "Reconstruction", code: "RPR" },
        remodel: { name: "Remodel", code: "RMD" },
        abatement: { name: "Abatement", code: "ABT" },
        remediation: { name: "Remediation", code: "REM" }
    },

    init() {
        this.el = document.getElementById("new-job-modal");
        if (!this.el) {
            console.warn("New job modal not found");
            return;
        }
        
        this.form = document.getElementById("new-job-form");
        this.sameToggle = document.getElementById("same-as-client-btn");
        this.propertyFields = document.getElementById("property-fields");
        
        // These might not exist at init time, so we get them lazily
        this.cacheFormElements();
        
        this.bindEvents();
        this.initialized = true;
        console.log("Job modal initialized");
    },

    /**
     * Cache form elements (called during init and open)
     */
    cacheFormElements() {
        if (this.form) {
            this.submitBtn = this.form.querySelector("button[type=\"submit\"]");
            this.clientNameInput = document.getElementById("job-client-name");
            this.jobTypeButtons = this.el.querySelectorAll(".job-type-btn");
        }
    },

    bindEvents() {
        // Close modal
        this.el.querySelector(".modal-backdrop").addEventListener("click", () => this.close());
        this.el.querySelector(".job-modal-close").addEventListener("click", () => this.close());
        this.el.querySelector(".job-modal-cancel").addEventListener("click", () => this.close());
        
        // Same toggle button
        if (this.sameToggle) {
            this.sameToggle.addEventListener("click", () => this.toggleSameAsClient());
        }
        
        // Job type buttons - multi-select
        this.el.querySelectorAll(".job-type-btn").forEach(btn => {
            btn.addEventListener("click", (e) => this.toggleJobType(e.currentTarget));
        });
        
        // Add contact buttons
        document.getElementById('add-client-btn')?.addEventListener('click', () => this.addContactRow('client'));
        document.getElementById('add-adjuster-btn')?.addEventListener('click', () => this.addContactRow('adjuster'));
        document.getElementById('add-site-contact-btn')?.addEventListener('click', () => this.addContactRow('site_contact'));

        // Form submission
        this.form.addEventListener("submit", (e) => this.handleSubmit(e));
        
        // Escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.el.classList.contains("open")) {
                this.close();
            }
        });
        
        // Delegate input events for validation (handles dynamically found elements)
        this.form.addEventListener("input", (e) => {
            if (e.target.id === "job-client-name" || e.target.id === "job-client-phone") {
                this.validateForm();
            }
            // Sync client fields to property when Same is active
            if (this.isSameAsClient) {
                const mapping = this.fieldMappings.find(m => m.client === e.target.id);
                if (mapping) {
                    this.syncFieldToProperty(mapping.client, mapping.prop);
                }
            }
        });
        
        // Also handle select changes
        this.form.addEventListener("change", (e) => {
            if (this.isSameAsClient) {
                const mapping = this.fieldMappings.find(m => m.client === e.target.id);
                if (mapping) {
                    this.syncFieldToProperty(mapping.client, mapping.prop);
                }
            }
        });
    },

    /**
     * Toggle job type selection (multi-select)
     */
    toggleJobType(btn) {
        const type = btn.dataset.type;

        if (this.selectedJobTypes.has(type)) {
            // Deselect
            this.selectedJobTypes.delete(type);
            btn.classList.remove("active");
        } else {
            // Select
            this.selectedJobTypes.add(type);
            btn.classList.add("active");
        }

        this.validateForm();

        console.log("Selected job types:", Array.from(this.selectedJobTypes));
    },
    
    /**
     * Get all selected job types with their codes
     */
    getSelectedJobTypes() {
        const types = [];
        this.selectedJobTypes.forEach(type => {
            const btn = document.querySelector(`.job-type-btn[data-type="${type}"]`);
            if (btn) {
                types.push({ type, code: btn.dataset.code });
            }
        });
        return types;
    },
    
    /**
     * Open the new job modal
     */
    open() {
        // Ensure form elements are cached
        this.cacheFormElements();
        
        // Reset job type selection
        this.selectedJobTypes.clear();
        this.el.querySelectorAll(".job-type-btn").forEach(btn => btn.classList.remove("active"));
        
        this.isSameAsClient = false;
        if (this.sameToggle) {
            this.sameToggle.classList.remove("active");
        }
        if (this.propertyFields) {
            this.propertyFields.classList.remove("same-active");
        }
        this.enablePropertyFields();
        this.form.reset();

        // Reset additional contact counters and containers
        this.additionalClientCount = 0;
        this.additionalAdjusterCount = 0;
        this.additionalSiteContactCount = 0;
        const clientsContainer = document.getElementById('additional-clients');
        const adjustersContainer = document.getElementById('additional-adjusters');
        const siteContactsContainer = document.getElementById('additional-site-contacts');
        if (clientsContainer) clientsContainer.innerHTML = '';
        if (adjustersContainer) adjustersContainer.innerHTML = '';
        if (siteContactsContainer) siteContactsContainer.innerHTML = '';

        this.validateForm();
        this.el.classList.add("open");
        
        // Focus on client name
        setTimeout(() => {
            if (this.clientNameInput) {
                this.clientNameInput.focus();
            }
        }, 100);
        
        console.log("Job modal opened");
    },

    /**
     * Close the modal
     */
    close() {
        this.el.classList.remove("open");
        console.log("Job modal closed");
    },

    /**
     * Validate form and enable/disable submit
     */
    validateForm() {
        if (!this.clientNameInput) {
            this.clientNameInput = document.getElementById("job-client-name");
        }
        if (!this.submitBtn && this.form) {
            this.submitBtn = this.form.querySelector("button[type=\"submit\"]");
        }

        const hasName = this.clientNameInput && this.clientNameInput.value.trim().length > 0;
        const hasPhone = document.getElementById('job-client-phone')?.value.trim().length > 0;
        const hasJobTypes = this.selectedJobTypes.size > 0;
        const isValid = hasName && hasPhone && hasJobTypes;

        if (this.submitBtn) {
            this.submitBtn.disabled = !isValid;
        }

        return isValid;
    },

    /**
     * Toggle Same as Client for property section
     */
    toggleSameAsClient() {
        this.isSameAsClient = !this.isSameAsClient;
        this.sameToggle.classList.toggle("active", this.isSameAsClient);
        
        if (this.propertyFields) {
            this.propertyFields.classList.toggle("same-active", this.isSameAsClient);
        }
        
        if (this.isSameAsClient) {
            // Copy all client values to property and disable
            this.syncAllFieldsToProperty();
            this.disablePropertyFields();
        } else {
            // Re-enable property fields (keep values)
            this.enablePropertyFields();
        }
        
        console.log("Same as client:", this.isSameAsClient);
    },

    /**
     * Sync a single field from client to property
     */
    syncFieldToProperty(clientId, propId) {
        const clientField = document.getElementById(clientId);
        const propField = document.getElementById(propId);
        if (clientField && propField) {
            propField.value = clientField.value;
        }
    },

    /**
     * Sync all mapped fields from client to property
     */
    syncAllFieldsToProperty() {
        this.fieldMappings.forEach(mapping => {
            this.syncFieldToProperty(mapping.client, mapping.prop);
        });
    },

    /**
     * Disable property address fields (when Same is active)
     */
    disablePropertyFields() {
        const propFields = document.querySelectorAll(".prop-field");
        propFields.forEach(field => {
            field.disabled = true;
        });
    },

    /**
     * Enable property address fields
     */
    enablePropertyFields() {
        const propFields = document.querySelectorAll(".prop-field");
        propFields.forEach(field => {
            field.disabled = false;
        });
    },

    /**
     * Add a new contact row for the given type
     */
    addContactRow(type) {
        let index, containerId;
        if (type === 'client') {
            this.additionalClientCount++;
            index = this.additionalClientCount;
            containerId = 'additional-clients';
        } else if (type === 'adjuster') {
            this.additionalAdjusterCount++;
            index = this.additionalAdjusterCount;
            containerId = 'additional-adjusters';
        } else if (type === 'site_contact') {
            this.additionalSiteContactCount++;
            index = this.additionalSiteContactCount;
            containerId = 'additional-site-contacts';
        }

        const container = document.getElementById(containerId);
        if (!container) return;

        const group = document.createElement('div');
        group.className = 'additional-contact-group';
        group.innerHTML = `
            <div class="job-field job-field-full">
                <label>Name</label>
                <input type="text" name="${type}_name_${index}" placeholder="Full name">
            </div>
            <div class="job-field">
                <label>Phone</label>
                <input type="tel" name="${type}_phone_${index}" placeholder="(555) 555-5555">
            </div>
            <div class="job-field">
                <label>Email</label>
                <input type="email" name="${type}_email_${index}" placeholder="email@example.com">
            </div>
            <button type="button" class="remove-contact-btn" title="Remove">&times;</button>
        `;

        group.querySelector('.remove-contact-btn').addEventListener('click', () => this.removeContactRow(group));
        container.appendChild(group);
    },

    /**
     * Remove a contact row
     */
    removeContactRow(groupEl) {
        groupEl.remove();
    },

    /**
     * Collect all form data
     */
    collectFormData() {
        const formData = new FormData(this.form);
        const data = {};

        // Handle multi-select fields: FormData emits duplicate keys
        // for <select multiple>, so accumulate them into arrays
        for (const [key, value] of formData.entries()) {
            if (key === "contact_search") continue; // Skip UI-only field
            if (data[key] !== undefined) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }

        // Ensure assignment fields are always arrays
        const multiFields = ["mitigation_pm", "reconstruction_pm", "estimator", "project_coordinator", "mitigation_techs"];
        multiFields.forEach(f => {
            if (data[f] && !Array.isArray(data[f])) {
                data[f] = [data[f]];
            } else if (!data[f]) {
                data[f] = [];
            }
        });

        // Explicit urgent checkbox handling
        data.urgent = !!document.getElementById("job-urgent")?.checked;

        // Add same_as_client flag
        data.same_as_client = this.isSameAsClient;

        // Add job types
        data.job_types = Array.from(this.selectedJobTypes);

        // Collect additional clients
        data.additional_clients = [];
        document.querySelectorAll('#additional-clients .additional-contact-group').forEach(group => {
            const inputs = group.querySelectorAll('input');
            const contact = { name: inputs[0]?.value || '', phone: inputs[1]?.value || '', email: inputs[2]?.value || '' };
            if (contact.name || contact.phone || contact.email) {
                data.additional_clients.push(contact);
            }
        });

        // Collect additional adjusters
        data.additional_adjusters = [];
        document.querySelectorAll('#additional-adjusters .additional-contact-group').forEach(group => {
            const inputs = group.querySelectorAll('input');
            const contact = { name: inputs[0]?.value || '', phone: inputs[1]?.value || '', email: inputs[2]?.value || '' };
            if (contact.name || contact.phone || contact.email) {
                data.additional_adjusters.push(contact);
            }
        });

        // Collect site contacts (including default index 0)
        data.site_contacts = [];
        const site0 = {
            name: document.getElementById('job-site-name-0')?.value || '',
            phone: document.getElementById('job-site-phone-0')?.value || '',
            email: document.getElementById('job-site-email-0')?.value || ''
        };
        if (site0.name || site0.phone || site0.email) {
            data.site_contacts.push(site0);
        }
        document.querySelectorAll('#additional-site-contacts .additional-contact-group').forEach(group => {
            const inputs = group.querySelectorAll('input');
            const contact = { name: inputs[0]?.value || '', phone: inputs[1]?.value || '', email: inputs[2]?.value || '' };
            if (contact.name || contact.phone || contact.email) {
                data.site_contacts.push(contact);
            }
        });

        // Backward compat: map site contact 0 to occ fields
        data.occ_name = site0.name;
        data.occ_phone = site0.phone;
        data.occ_email = site0.email;

        return data;
    },

    /**
     * Handle form submission
     */
    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateForm()) {
            return;
        }

        const data = this.collectFormData();
        console.log("Creating job:", data);

        if (this.submitBtn) {
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = "Creating...";
        }

        try {
            const result = await api.createApexJob(data);
            console.log("Job created:", result);
            this.close();
            // Refresh the jobs list
            if (window.apexJobs && typeof window.apexJobs.loadJobs === "function") {
                window.apexJobs.loadJobs();
            }
        } catch (err) {
            console.error("Failed to create job:", err);
            alert("Failed to create job: " + err.message);
        } finally {
            if (this.submitBtn) {
                this.submitBtn.disabled = false;
                this.submitBtn.textContent = "Create Job";
            }
        }
    }
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    jobModal.init();
});
