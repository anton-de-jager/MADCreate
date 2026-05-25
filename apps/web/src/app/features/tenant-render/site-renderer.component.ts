import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroSection } from './sections/hero.section';
import { FeaturesSection } from './sections/features.section';
import { CtaSection } from './sections/cta.section';
import { PricingSection } from './sections/pricing.section';
import { FaqSection } from './sections/faq.section';
import { TestimonialsSection } from './sections/testimonials.section';
import { StatsSection } from './sections/stats.section';
import { ContactSection } from './sections/contact.section';
import { LogosSection } from './sections/logos.section';
import { GallerySection } from './sections/gallery.section';
import { TeamSection } from './sections/team.section';
import { RichTextSection } from './sections/rich-text.section';
import { VideoSection } from './sections/video.section';
import { NewsletterSection } from './sections/newsletter.section';
import { SplitSection } from './sections/split.section';
import { StepsSection } from './sections/steps.section';
import { HeaderSection } from './sections/header.section';
import { FooterSection } from './sections/footer.section';
import { GenericSection } from './sections/generic.section';

@Component({
  selector: 'mc-site-renderer',
  standalone: true,
  imports: [
    CommonModule,
    HeroSection, FeaturesSection, CtaSection, PricingSection,
    FaqSection, TestimonialsSection, StatsSection, ContactSection,
    LogosSection, GallerySection, TeamSection, RichTextSection,
    VideoSection, NewsletterSection, SplitSection, StepsSection,
    HeaderSection, FooterSection, GenericSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @for (s of sections; track $index; let i = $index) {
    <div class="relative group cursor-pointer"
         (click)="selectSection.emit(i); $event.stopPropagation()"
         [class.ring-2]="selectedIndex === i"
         [class.ring-brand]="selectedIndex === i">
      @switch (s.kind) {
        @case ('hero')         { <mc-hero-section [props]="s.props" /> }
        @case ('features')     { <mc-features-section [props]="s.props" /> }
        @case ('cta')          { <mc-cta-section [props]="s.props" /> }
        @case ('pricing')      { <mc-pricing-section [props]="s.props" /> }
        @case ('faq')          { <mc-faq-section [props]="s.props" /> }
        @case ('testimonials') { <mc-testimonials-section [props]="s.props" /> }
        @case ('stats')        { <mc-stats-section [props]="s.props" /> }
        @case ('contact')      { <mc-contact-section [props]="s.props" [tenantId]="tenantId" [pageSlug]="pageSlug" /> }
        @case ('logos')        { <mc-logos-section [props]="s.props" /> }
        @case ('gallery')      { <mc-gallery-section [props]="s.props" /> }
        @case ('team')         { <mc-team-section [props]="s.props" /> }
        @case ('rich-text')    { <mc-rich-text-section [props]="s.props" /> }
        @case ('video')        { <mc-video-section [props]="s.props" /> }
        @case ('newsletter')   { <mc-newsletter-section [props]="s.props" [tenantId]="tenantId" [pageSlug]="pageSlug" /> }
        @case ('split')        { <mc-split-section [props]="s.props" /> }
        @case ('steps')        { <mc-steps-section [props]="s.props" /> }
        @case ('header')       { <mc-header-section [props]="s.props" /> }
        @case ('footer')       { <mc-footer-section [props]="s.props" /> }
        @default               { <mc-generic-section [kind]="s.kind" [props]="s.props" /> }
      }
    </div>
  }
  `,
})
export class SiteRendererComponent {
  @Input() sections: Array<{ kind: string; props: Record<string, unknown> }> = [];
  @Input() tenantId?: string;
  @Input() pageSlug?: string;
  @Input() selectedIndex: number | null = null;
  @Output() selectSection = new EventEmitter<number>();
}
