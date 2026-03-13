import { Injectable, Inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {

  private defaultImage = 'https://sena-digital.com/assets/images/sena-digital-og-image.jpg';
  private defaultUrl = 'https://sena-digital.com';

  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(DOCUMENT) private document: Document
  ) { }

  /**
   * Set page title
   */
  setTitle(title: string): void {
    this.titleService.setTitle(title);
  }

  /**
   * Set comprehensive meta tags for SEO
   */
  setMetaTags(config: SeoConfig): void {
    const {
      title,
      description,
      keywords = '',
      image = this.defaultImage,
      url = this.defaultUrl,
      type = 'website',
      author = 'Sena Digital'
    } = config;

    // Set page title
    this.setTitle(title);

    // Basic meta tags
    this.metaService.updateTag({ name: 'description', content: description });

    if (keywords) {
      this.metaService.updateTag({ name: 'keywords', content: keywords });
    }

    this.metaService.updateTag({ name: 'author', content: author });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow' });

    // Open Graph tags for social media
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:type', content: type });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:image', content: image });
    this.metaService.updateTag({ property: 'og:site_name', content: 'Sena Digital' });
    this.metaService.updateTag({ property: 'og:locale', content: 'id_ID' });

    // Twitter Card tags
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: image });
    this.metaService.updateTag({ name: 'twitter:site', content: '@senadigital' });

    // Set canonical URL
    this.setCanonicalURL(url);
  }

  /**
   * Add structured data (JSON-LD) to page
   */
  addStructuredData(schema: any): void {
    // Remove existing structured data if any
    const existingScript = this.document.getElementById('structured-data');
    if (existingScript) {
      existingScript.remove();
    }

    // Create new script tag with structured data
    const script = this.document.createElement('script');
    script.id = 'structured-data';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    this.document.head.appendChild(script);
  }

  /**
   * Set canonical URL to prevent duplicate content
   */
  setCanonicalURL(url: string): void {
    // Remove existing canonical link if any
    const existingLink = this.document.querySelector('link[rel="canonical"]');
    if (existingLink) {
      existingLink.remove();
    }

    // Create new canonical link
    const link = this.document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);
    this.document.head.appendChild(link);
  }

  /**
   * Generate Organization structured data
   */
  getOrganizationSchema(): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'Sena Digital',
      'description': 'Platform Undangan Digital Pernikahan Terbaik di Indonesia',
      'url': 'https://sena-digital.com',
      'logo': 'https://sena-digital.com/assets/wom.png',
      'contactPoint': {
        '@type': 'ContactPoint',
        'contactType': 'Customer Service',
        'availableLanguage': 'Indonesian'
      },
      'sameAs': [
        'https://facebook.com/senadigital',
        'https://instagram.com/senadigital',
        'https://twitter.com/senadigital'
      ]
    };
  }

  /**
   * Generate Service structured data
   */
  getServiceSchema(): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'serviceType': 'Undangan Digital Pernikahan',
      'provider': {
        '@type': 'Organization',
        'name': 'Sena Digital'
      },
      'areaServed': {
        '@type': 'Country',
        'name': 'Indonesia'
      },
      'hasOfferCatalog': {
        '@type': 'OfferCatalog',
        'name': 'Layanan Undangan Digital',
        'itemListElement': [
          {
            '@type': 'Offer',
            'itemOffered': {
              '@type': 'Service',
              'name': 'Undangan Website Pernikahan'
            }
          },
          {
            '@type': 'Offer',
            'itemOffered': {
              '@type': 'Service',
              'name': 'Undangan Video Pernikahan'
            }
          },
          {
            '@type': 'Offer',
            'itemOffered': {
              '@type': 'Service',
              'name': 'Amplop Digital'
            }
          }
        ]
      }
    };
  }

  /**
   * Generate WebSite structured data with search action
   */
  getWebSiteSchema(): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'Sena Digital',
      'url': 'https://sena-digital.com',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': 'https://sena-digital.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    };
  }

  /**
   * Generate Event structured data for wedding pages
   */
  getWeddingEventSchema(): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      'name': 'Undangan Pernikahan Digital',
      'description': 'Undangan pernikahan digital dengan desain elegan',
      'eventAttendanceMode': 'https://schema.org/OnlineEventAttendanceMode',
      'eventStatus': 'https://schema.org/EventScheduled',
      'organizer': {
        '@type': 'Organization',
        'name': 'Sena Digital'
      }
    };
  }

  /**
   * Generate LocalBusiness structured data
   */
  getLocalBusinessSchema(): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      'name': 'Sena Digital',
      'description': 'Platform Undangan Digital Pernikahan',
      'url': 'https://sena-digital.com',
      'priceRange': 'Gratis - Rp 500.000',
      'areaServed': 'Indonesia'
    };
  }

  /**
   * Remove all meta tags (useful for cleanup)
   */
  removeMetaTags(): void {
    this.metaService.removeTag('name="description"');
    this.metaService.removeTag('name="keywords"');
    this.metaService.removeTag('property="og:title"');
    this.metaService.removeTag('property="og:description"');
    this.metaService.removeTag('property="og:image"');
    this.metaService.removeTag('property="og:url"');
  }
}
