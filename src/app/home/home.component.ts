import { Component, OnInit } from '@angular/core';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'wc-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor(private seoService: SeoService) { }

  ngOnInit(): void {
    this.setSeoTags();
  }

  private setSeoTags(): void {
    // Set comprehensive SEO meta tags for homepage
    this.seoService.setMetaTags({
      title: 'Undangan Digital Pernikahan - Sena Digital | Buat Undangan Nikah Online Gratis',
      description: 'Platform undangan digital pernikahan terbaik di Indonesia. Buat undangan website dan video pernikahan dengan mudah, gratis, dan elegan. Fitur RSVP, amplop digital, dan galeri foto.',
      keywords: 'undangan digital pernikahan, undangan nikah online, buat undangan digital, undangan pernikahan website, undangan video pernikahan, undangan digital gratis, wedding invitation, amplop digital, RSVP online, undangan online murah',
      url: 'https://sena-digital.com',
      image: 'https://sena-digital.com/assets/images/sena-digital-og-image.jpg',
      type: 'website'
    });

    // Add Service structured data
    this.seoService.addStructuredData(this.seoService.getServiceSchema());

    // Add WebSite structured data
    const websiteSchema = this.seoService.getWebSiteSchema();
    const serviceSchema = this.seoService.getServiceSchema();

    // Combine both schemas
    this.seoService.addStructuredData([websiteSchema, serviceSchema]);
  }

}
