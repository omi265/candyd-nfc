import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Candyd NFC',
    short_name: 'Candyd',
    description: 'Unbox a moment. Relive a memory. Candyd uses NFC technology to link your physical products to digital experiences.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: '#FDF2EC',
    theme_color: '#5B2D7D',
    // @ts-ignore - experimental link handling
    handle_links: 'auto',
    // @ts-ignore - capture_links helps with PWA navigation
    capture_links: 'existing-client-navigate',
    // @ts-ignore - launch_handler is experimental but supported by Chrome/Android
    launch_handler: {
      client_mode: 'focus-existing'
    },
    // @ts-ignore - protocol_handlers can help with deep linking
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
