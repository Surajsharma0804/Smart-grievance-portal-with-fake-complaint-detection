import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nagriksetu.in';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/how-it-works', '/stats', '/departments', '/nearby'],
      disallow: ['/my', '/report', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
