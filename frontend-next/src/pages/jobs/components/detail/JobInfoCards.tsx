import { Phone, Mail, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.js'
import {
  formatPhone,
  formatAddress,
  formatCurrency,
  mapsLink,
} from '@/pages/jobs/utils/jobFormatters.js'
import type { ApexJob } from '@/types/index.js'

interface JobInfoCardsProps {
  job: ApexJob
}

function InfoLine({
  icon: Icon,
  href,
  children,
}: {
  icon?: typeof Phone
  href?: string
  children: React.ReactNode
}) {
  const content = (
    <span className="flex items-center gap-2 text-sm text-text-secondary">
      {Icon && <Icon className="size-4 shrink-0" />}
      {children}
    </span>
  )
  if (href) {
    return (
      <a href={href} className="hover:underline">
        {content}
      </a>
    )
  }
  return content
}

export function JobInfoCards({ job }: JobInfoCardsProps) {
  const clientAddress = formatAddress(
    job.client_street,
    job.client_city,
    job.client_state,
    job.client_zip,
    job.client_unit,
  )
  const propAddress = formatAddress(
    job.prop_street,
    job.prop_city,
    job.prop_state,
    job.prop_zip,
    job.prop_unit,
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Client */}
      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {job.client_name && (
            <p className="font-medium text-sm text-text-primary">
              {job.client_name}
            </p>
          )}
          {job.client_phone && (
            <InfoLine icon={Phone} href={`tel:${job.client_phone}`}>
              {formatPhone(job.client_phone)}
            </InfoLine>
          )}
          {job.client_email && (
            <InfoLine icon={Mail} href={`mailto:${job.client_email}`}>
              {job.client_email}
            </InfoLine>
          )}
          {clientAddress && (
            <InfoLine icon={MapPin}>{clientAddress}</InfoLine>
          )}
        </CardContent>
      </Card>

      {/* Insurance */}
      <Card>
        <CardHeader>
          <CardTitle>Insurance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {job.ins_carrier && (
            <InfoLine>{job.ins_carrier}</InfoLine>
          )}
          {job.ins_claim && (
            <InfoLine>Claim # {job.ins_claim}</InfoLine>
          )}
          {job.ins_policy && (
            <InfoLine>Policy # {job.ins_policy}</InfoLine>
          )}
          {job.deductible != null && job.deductible > 0 && (
            <InfoLine>Deductible: {formatCurrency(job.deductible)}</InfoLine>
          )}
          {job.adj_name && (
            <p className="text-sm text-text-secondary font-medium pt-1">
              Adjuster: {job.adj_name}
            </p>
          )}
          {job.adj_phone && (
            <InfoLine icon={Phone} href={`tel:${job.adj_phone}`}>
              {formatPhone(job.adj_phone)}
            </InfoLine>
          )}
          {job.adj_email && (
            <InfoLine icon={Mail} href={`mailto:${job.adj_email}`}>
              {job.adj_email}
            </InfoLine>
          )}
        </CardContent>
      </Card>

      {/* Property */}
      <Card>
        <CardHeader>
          <CardTitle>Property</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {propAddress && (
            <a
              href={mapsLink(job.prop_street, job.prop_city, job.prop_state, job.prop_zip)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              <InfoLine icon={MapPin}>{propAddress}</InfoLine>
            </a>
          )}
          {job.prop_type && (
            <InfoLine>Type: {job.prop_type}</InfoLine>
          )}
          {job.occ_name && (
            <p className="text-sm text-text-secondary font-medium pt-1">
              Occupant: {job.occ_name}
            </p>
          )}
          {job.occ_phone && (
            <InfoLine icon={Phone} href={`tel:${job.occ_phone}`}>
              {formatPhone(job.occ_phone)}
            </InfoLine>
          )}
          {job.occ_email && (
            <InfoLine icon={Mail} href={`mailto:${job.occ_email}`}>
              {job.occ_email}
            </InfoLine>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
