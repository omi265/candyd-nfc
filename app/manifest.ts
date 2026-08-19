import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: 'com.ourdve.nfc.app',
    name: 'Our Dve',
    short_name: 'Our Dve',
    description: 'Our Dve uses NFC technology to link your physical products to digital experiences.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: '#F6F2EC',
    theme_color: '#556B5A',
    // @ts-ignore
    handle_links: 'preferred',
    // @ts-ignore
    capture_links: 'existing-client-navigate',
    // @ts-ignore
    launch_handler: {
      client_mode: ['focus-existing', 'navigate-new']
    },
    // @ts-ignore
    protocol_handlers: [
      {
        protocol: "web+candyd",
        url: "/nfc/login?token=%s"
      }
    ],
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
