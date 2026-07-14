import { MapPin, Phone, Mail, Clock, Facebook, Instagram, Send, Youtube } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/lib/locale'
import { OFFICE_SOCIAL_LINKS, type OfficeSocialKey } from '@/lib/contact/office'

const SOCIAL_ICONS: Record<OfficeSocialKey, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  telegram: Send,
  youtube: Youtube,
}

/**
 * Office info panel (Page 23 §3.2 right column) — address / phone (tel:) /
 * email (mailto:) / working hours / social links, sourced from
 * `static.contact.office` i18n messages.
 */
export default async function OfficeInfo({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'static.contact.office' })

  const phone = t('phone')
  const email = t('email')
  const phoneHref = `tel:${phone.replace(/[^+\d]/g, '')}`

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">{t('heading')}</h2>

      <div className="flex gap-3 items-start text-gray-700">
        <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-xs text-gray-500">{t('addressLabel')}</p>
          <p>{t('address')}</p>
        </div>
      </div>

      <div className="flex gap-3 items-center text-gray-700">
        <Phone className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="text-xs text-gray-500">{t('phoneLabel')}</p>
          <a href={phoneHref} className="hover:text-primary transition-colors">
            {phone}
          </a>
        </div>
      </div>

      <div className="flex gap-3 items-center text-gray-700">
        <Mail className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="text-xs text-gray-500">{t('emailLabel')}</p>
          <a href={`mailto:${email}`} className="hover:text-primary transition-colors">
            {email}
          </a>
        </div>
      </div>

      <div className="flex gap-3 items-center text-gray-700">
        <Clock className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="text-xs text-gray-500">{t('hoursLabel')}</p>
          <p>{t('hours')}</p>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">{t('socialLabel')}</p>
        <div className="flex gap-3">
          {OFFICE_SOCIAL_LINKS.map(({ key, href }) => {
            const Icon = SOCIAL_ICONS[key]
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={key}
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
