import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarketingHeader } from '../shared/marketing-header.component';
import { MarketingFooter } from '../shared/marketing-footer.component';

const MAD_UNIVERSE_APPS = [
  { name: 'MAD Prospects', url: 'https://madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-madprospects.png' },
  { name: 'MADai', url: 'https://madai.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADai.png' },
  { name: 'MADAuthor', url: 'https://madauthor.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADAuthor.png' },
  { name: 'MAD Cloud', url: 'https://madcloud.madprospects.com/', logo: '' },
  { name: 'MADCreate', url: 'https://madcreate.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADCreate.png' },
  { name: 'MADHub', url: 'https://madhub.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADHub.png' },
  { name: 'MADLeads', url: 'https://madleads.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADLeads.png' },
  { name: 'MADLearn', url: 'https://madlearn.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADLearn.png' },
  { name: 'MADLove', url: 'https://madlove.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADLove.png' },
  { name: 'MADMultisciple', url: 'https://madmultisciple.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADMultisciple.png' },
  { name: 'MADPulse', url: 'https://madpulse.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADPulse.png' },
  { name: 'MADRecruiting', url: 'https://madrecruiting.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADRecruiting.png' },
] as const;

@Component({
  selector: 'mc-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, MarketingHeader, MarketingFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      display: block;
      letter-spacing: 0;
    }
    :host * {
      letter-spacing: 0 !important;
    }
    .foundry-page {
      background:
        radial-gradient(circle at 18% 14%, rgb(192 38 211 / 0.18), transparent 28rem),
        radial-gradient(circle at 82% 8%, rgb(20 184 166 / 0.16), transparent 26rem),
        radial-gradient(circle at 70% 72%, rgb(163 230 53 / 0.13), transparent 24rem),
        linear-gradient(180deg, #070911 0%, #0b111c 46%, #f8fafc 46%, #ffffff 100%);
      color: #f8fafc;
      overflow: hidden;
    }
    .hero-stage {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }
    .hero-stage::before {
      content: '';
      position: absolute;
      inset: -30% -10%;
      background-image:
        linear-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgb(255 255 255 / 0.06) 1px, transparent 1px);
      background-size: 46px 46px;
      mask-image: linear-gradient(180deg, transparent 0%, black 16%, black 74%, transparent 100%);
      transform: perspective(900px) rotateX(56deg) translateY(12%);
      transform-origin: top;
    }
    .signal-line {
      position: absolute;
      height: 1px;
      width: 36vw;
      background: linear-gradient(90deg, transparent, rgb(163 230 53 / 0.85), transparent);
      animation: scan 5s ease-in-out infinite;
      opacity: 0.75;
    }
    .signal-line.one { left: 3%; top: 30%; }
    .signal-line.two { right: 6%; top: 58%; animation-delay: -2s; background: linear-gradient(90deg, transparent, rgb(20 184 166 / 0.85), transparent); }
    .signal-line.three { left: 42%; top: 76%; animation-delay: -3.3s; background: linear-gradient(90deg, transparent, rgb(249 115 22 / 0.75), transparent); }
    @keyframes scan {
      0%, 100% { transform: translateX(-20px); opacity: 0.18; }
      50% { transform: translateX(34px); opacity: 0.88; }
    }
    .launch-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      border: 1px solid rgb(255 255 255 / 0.14);
      background: rgb(255 255 255 / 0.08);
      color: #ccfbf1;
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 800;
      backdrop-filter: blur(16px);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #64DD17;
      box-shadow: 0 0 0 6px rgb(163 230 53 / 0.16), 0 0 24px rgb(163 230 53 / 0.72);
    }
    .hero-title {
      font-size: clamp(3.25rem, 8vw, 7.75rem);
      line-height: 0.88;
      font-weight: 950;
      letter-spacing: 0;
      text-wrap: balance;
    }
    .hero-title mark {
      color: transparent;
      background:
        linear-gradient(90deg, #64DD17 0%, #00C853 42%, #64DD17 76%, #AAEC7F 100%);
      -webkit-background-clip: text;
      background-clip: text;
    }
    .hero-copy {
      color: rgb(226 232 240 / 0.82);
      font-size: clamp(1.05rem, 2vw, 1.28rem);
      line-height: 1.65;
      max-width: 710px;
    }
    .command-deck {
      position: relative;
      min-height: 620px;
    }
    .orbit-panel {
      position: absolute;
      border: 1px solid rgb(255 255 255 / 0.16);
      background: linear-gradient(145deg, rgb(15 23 42 / 0.92), rgb(15 23 42 / 0.62));
      box-shadow: 0 28px 90px rgb(0 0 0 / 0.28);
      backdrop-filter: blur(22px);
      border-radius: 8px;
      overflow: hidden;
    }
    .orbit-panel.main {
      inset: 54px 3% auto 7%;
      width: min(720px, 82vw);
      min-height: 420px;
    }
    .orbit-panel.side {
      right: 4%;
      top: 18px;
      width: min(340px, 42vw);
      min-height: 245px;
      transform: rotate(2deg);
    }
    .orbit-panel.stats {
      right: 13%;
      bottom: 22px;
      width: 360px;
      min-height: 192px;
      transform: rotate(-2deg);
    }
    .orbit-panel.brief {
      left: 0;
      bottom: 78px;
      width: 330px;
      min-height: 178px;
      transform: rotate(-3deg);
    }
    .deck-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 42px;
      padding: 0 14px;
      border-bottom: 1px solid rgb(255 255 255 / 0.12);
      background: rgb(255 255 255 / 0.06);
    }
    .deck-dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: #64DD17;
    }
    .deck-dot:nth-child(2) { background: #64DD17; }
    .deck-dot:nth-child(3) { background: #64DD17; }
    .site-preview {
      margin: 20px;
      min-height: 330px;
      border-radius: 8px;
      background:
        linear-gradient(135deg, rgb(255 255 255 / 0.14), rgb(255 255 255 / 0.02)),
        radial-gradient(circle at 75% 22%, rgb(163 230 53 / 0.38), transparent 9rem),
        radial-gradient(circle at 24% 68%, rgb(20 184 166 / 0.26), transparent 10rem),
        #111827;
      padding: 22px;
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 20px;
    }
    .preview-hero {
      align-self: center;
    }
    .preview-tag {
      display: inline-flex;
      color: #64DD17;
      background: rgb(163 230 53 / 0.12);
      border: 1px solid rgb(163 230 53 / 0.24);
      padding: 5px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      margin-bottom: 16px;
    }
    .preview-lines {
      display: grid;
      gap: 10px;
      max-width: 280px;
    }
    .preview-lines span {
      height: 14px;
      border-radius: 999px;
      background: rgb(255 255 255 / 0.72);
    }
    .preview-lines span:nth-child(1) { width: 92%; height: 22px; }
    .preview-lines span:nth-child(2) { width: 78%; height: 22px; }
    .preview-lines span:nth-child(3) { width: 96%; opacity: 0.38; }
    .preview-lines span:nth-child(4) { width: 64%; opacity: 0.32; }
    .preview-mosaic {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .preview-tile {
      min-height: 114px;
      border-radius: 8px;
      background: rgb(255 255 255 / 0.1);
      border: 1px solid rgb(255 255 255 / 0.12);
      padding: 14px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 8px;
    }
    .preview-tile b {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: linear-gradient(135deg, #64DD17, #00C853);
      display: block;
    }
    .preview-tile i {
      display: block;
      height: 8px;
      width: 80%;
      border-radius: 999px;
      background: rgb(255 255 255 / 0.45);
    }
    .side-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 13px 14px;
      border-bottom: 1px solid rgb(255 255 255 / 0.1);
      color: #e5e7eb;
      font-size: 13px;
    }
    .side-row strong {
      color: white;
      font-weight: 850;
    }
    .status-chip {
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 850;
      background: rgb(163 230 53 / 0.14);
      color: #9AE968;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      padding: 16px;
    }
    .metric {
      border: 1px solid rgb(255 255 255 / 0.12);
      border-radius: 8px;
      padding: 12px;
      background: rgb(255 255 255 / 0.06);
    }
    .metric b {
      color: white;
      display: block;
      font-size: 24px;
      line-height: 1;
    }
    .metric span {
      color: rgb(203 213 225 / 0.72);
      font-size: 11px;
      display: block;
      margin-top: 6px;
    }
    .prompt-stack {
      padding: 16px;
      display: grid;
      gap: 10px;
    }
    .prompt-line {
      display: flex;
      align-items: center;
      gap: 10px;
      color: rgb(226 232 240 / 0.82);
      font-size: 12px;
    }
    .prompt-line::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #00C853;
      box-shadow: 0 0 18px rgb(34 211 238 / 0.66);
    }
    .light-band {
      background: #ffffff;
      color: #0f172a;
    }
    .section-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #00C853;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .section-label::before {
      content: '';
      width: 22px;
      height: 2px;
      background: #64DD17;
    }
    .section-title {
      font-size: clamp(2.3rem, 5vw, 4.8rem);
      line-height: 0.96;
      font-weight: 950;
      text-wrap: balance;
    }
    .feature-card {
      border: 1px solid rgb(15 23 42 / 0.1);
      background: #ffffff;
      border-radius: 8px;
      padding: 26px;
      min-height: 248px;
      box-shadow: 0 22px 60px rgb(15 23 42 / 0.08);
      transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
    }
    .feature-card:hover {
      transform: translateY(-5px);
      border-color: rgb(20 184 166 / 0.36);
      box-shadow: 0 28px 80px rgb(15 23 42 / 0.12);
    }
    .feature-icon {
      width: 46px;
      height: 46px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      margin-bottom: 22px;
      color: #07111f;
      background: linear-gradient(135deg, #64DD17, #00C853);
    }
    .playbook-card {
      position: relative;
      min-height: 360px;
      overflow: hidden;
      border-radius: 8px;
      color: white;
      background: #0f172a;
      box-shadow: 0 26px 80px rgb(15 23 42 / 0.14);
    }
    .playbook-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--playbook-bg);
      opacity: 0.92;
    }
    .playbook-card::after {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgb(255 255 255 / 0.12) 1px, transparent 1px),
        linear-gradient(90deg, rgb(255 255 255 / 0.12) 1px, transparent 1px);
      background-size: 34px 34px;
      mask-image: linear-gradient(180deg, transparent, black 22%, black 78%, transparent);
      opacity: 0.28;
    }
    .playbook-body {
      position: relative;
      z-index: 1;
      height: 100%;
      min-height: 360px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .playbook-kicker {
      display: inline-flex;
      width: max-content;
      border: 1px solid rgb(255 255 255 / 0.22);
      background: rgb(255 255 255 / 0.12);
      border-radius: 999px;
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 850;
    }
    .dark-slab {
      background:
        radial-gradient(circle at 20% 18%, rgb(249 115 22 / 0.18), transparent 22rem),
        radial-gradient(circle at 82% 40%, rgb(20 184 166 / 0.2), transparent 24rem),
        #07111f;
      color: white;
    }
    .price-card {
      border: 1px solid rgb(255 255 255 / 0.12);
      background: rgb(255 255 255 / 0.07);
      border-radius: 8px;
      padding: 28px;
      min-height: 570px;
      backdrop-filter: blur(18px);
    }
    .price-card.featured {
      background: linear-gradient(145deg, rgb(163 230 53 / 0.14), rgb(20 184 166 / 0.12), rgb(255 255 255 / 0.07));
      border-color: rgb(163 230 53 / 0.42);
      box-shadow: 0 0 0 1px rgb(163 230 53 / 0.16), 0 28px 90px rgb(20 184 166 / 0.16);
    }
    .proof-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      border: 1px solid rgb(255 255 255 / 0.12);
      border-radius: 8px;
      overflow: hidden;
      background: rgb(255 255 255 / 0.06);
      backdrop-filter: blur(18px);
    }
    .proof-cell {
      padding: 24px;
      border-right: 1px solid rgb(255 255 255 / 0.1);
    }
    .proof-cell:last-child {
      border-right: 0;
    }
    .proof-cell b {
      display: block;
      font-size: clamp(2rem, 4vw, 3.3rem);
      line-height: 1;
      color: white;
    }
    .proof-cell span {
      display: block;
      margin-top: 9px;
      color: rgb(226 232 240 / 0.68);
      font-size: 13px;
    }
    .faq-item {
      border-top: 1px solid rgb(15 23 42 / 0.12);
      padding: 24px 0;
    }
    .faq-item summary {
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      font-weight: 850;
      color: #0f172a;
    }
    .faq-item summary::-webkit-details-marker {
      display: none;
    }
    .faq-item p {
      margin-top: 12px;
      color: #475569;
      line-height: 1.7;
      max-width: 760px;
    }
    .final-cta {
      position: relative;
      background:
        radial-gradient(circle at 18% 30%, rgb(163 230 53 / 0.22), transparent 22rem),
        radial-gradient(circle at 86% 22%, rgb(192 38 211 / 0.26), transparent 24rem),
        linear-gradient(135deg, #07111f, #101827 58%, #082f49);
      color: white;
      overflow: hidden;
    }
    .final-cta::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgb(255 255 255 / 0.07) 1px, transparent 1px);
      background-size: 42px 42px;
      mask-image: radial-gradient(circle at 50% 50%, black, transparent 72%);
    }
    @media (max-width: 980px) {
      .command-deck {
        min-height: 720px;
      }
      .orbit-panel.main {
        inset: 34px auto auto 0;
        width: 100%;
      }
      .orbit-panel.side {
        top: 504px;
        right: 0;
        width: 48%;
      }
      .orbit-panel.brief {
        left: 0;
        bottom: 0;
        width: 48%;
      }
      .orbit-panel.stats {
        display: none;
      }
      .proof-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .proof-cell:nth-child(2) {
        border-right: 0;
      }
      .proof-cell:nth-child(-n+2) {
        border-bottom: 1px solid rgb(255 255 255 / 0.1);
      }
    }
    @media (max-width: 640px) {
      .command-deck {
        min-height: auto;
        display: grid;
        gap: 16px;
      }
      .orbit-panel,
      .orbit-panel.main,
      .orbit-panel.side,
      .orbit-panel.brief,
      .orbit-panel.stats {
        position: relative;
        inset: auto;
        width: 100%;
        min-height: 0;
        transform: none;
      }
      .site-preview {
        grid-template-columns: 1fr;
        margin: 14px;
        min-height: 0;
      }
      .proof-strip {
        grid-template-columns: 1fr;
      }
      .proof-cell,
      .proof-cell:nth-child(2),
      .proof-cell:nth-child(-n+2) {
        border-right: 0;
        border-bottom: 1px solid rgb(255 255 255 / 0.1);
      }
      .proof-cell:last-child {
        border-bottom: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .signal-line {
        animation: none;
      }
    }
    .mad-universe-strip {
      position: relative;
      overflow: hidden;
      background: #0d1628;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
      padding: 14px 0;
    }
    .mad-universe-inner {
      display: flex;
      align-items: center;
      gap: 22px;
      width: min(1080px, calc(100vw - 32px));
      margin: 0 auto;
    }
    .mad-universe-kicker {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: #59DB8F;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .mad-universe-kicker span { color: #00C853; }
    .mad-universe-marquee {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
      mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
    }
    .mad-universe-track {
      display: flex;
      align-items: center;
      gap: 32px;
      width: max-content;
      animation: madUniverseScroll 44s linear infinite;
    }
    .mad-universe-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: max-content;
      opacity: 0.78;
      text-decoration: none;
      transition: opacity 160ms ease, transform 160ms ease;
    }
    .mad-universe-link:hover { opacity: 1; transform: translateY(-1px); }
    .mad-universe-link img {
      display: block;
      width: auto;
      max-width: 150px;
      height: 21px;
      object-fit: contain;
      filter: drop-shadow(0 0 12px rgba(255,255,255,0.08));
    }
    .mad-universe-text {
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      white-space: nowrap;
    }
    @keyframes madUniverseScroll {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
    @media (max-width: 760px) {
      .mad-universe-inner {
        align-items: stretch;
        flex-direction: column;
        gap: 10px;
      }
      .mad-universe-kicker { justify-content: center; }
      .mad-universe-track { gap: 26px; animation-duration: 52s; }
      .mad-universe-link img { height: 19px; max-width: 136px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .mad-universe-track {
        animation: none;
        flex-wrap: wrap;
        justify-content: center;
        width: auto;
      }
      .mad-universe-marquee {
        -webkit-mask-image: none;
        mask-image: none;
      }
    }
  `],
  template: `
    <div class="foundry-page">
      <mc-marketing-header />

      <section class="relative min-h-[calc(100vh-4rem)] flex items-center">
        <div class="hero-stage" aria-hidden="true">
          <span class="signal-line one"></span>
          <span class="signal-line two"></span>
          <span class="signal-line three"></span>
        </div>

        <div class="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 lg:py-24 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
          <div>
            <div class="launch-pill mb-8">
              <span class="pulse-dot" aria-hidden="true"></span>
              Client site foundry for agencies and ambitious SMEs
            </div>

            <h1 class="hero-title">
              Launch sites like a
              <mark>production line.</mark>
            </h1>

            <p class="hero-copy mt-8">
              MADCreate turns a client brief into a live, branded, multi-page website
              with tenant isolation, custom domains, forms, analytics and deployment
              paths already wired in.
            </p>

            <div class="mt-10 flex flex-col sm:flex-row gap-3">
              <a routerLink="/register" class="mc-btn-primary !py-4 !px-7 text-base font-black">
                Start building free
                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </a>
              <a routerLink="/login" class="mc-btn-ghost !py-4 !px-7 text-base">
                Sign in to studio
              </a>
            </div>
            <p class="mt-4 text-xs text-slate-400">No credit card required. Generate your first site in under 2 minutes.</p>

            <div class="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              @for (claim of heroClaims; track claim) {
                <span class="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
                  <i class="fa-solid fa-check text-accent text-xs"></i>
                  {{ claim }}
                </span>
              }
            </div>
          </div>

          <div class="command-deck" aria-label="MADCreate product preview">
            <div class="orbit-panel main">
              <div class="deck-bar">
                <span class="deck-dot"></span>
                <span class="deck-dot"></span>
                <span class="deck-dot"></span>
                <span class="ml-2 text-xs text-slate-400 font-bold">madcreate://generation/brief-to-site</span>
              </div>
              <div class="site-preview">
                <div class="preview-hero">
                  <span class="preview-tag">AI generated: 94% ready</span>
                  <div class="preview-lines" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div class="mt-8 flex gap-3" aria-hidden="true">
                    <span class="h-10 w-28 rounded-md bg-brand"></span>
                    <span class="h-10 w-20 rounded-md border border-white/20"></span>
                  </div>
                </div>
                <div class="preview-mosaic" aria-hidden="true">
                  <div class="preview-tile"><b></b><i></i><i class="!w-3/5"></i></div>
                  <div class="preview-tile"><b class="!bg-gradient-to-br !from-brand !to-accent"></b><i></i><i class="!w-2/3"></i></div>
                  <div class="preview-tile"><b class="!bg-gradient-to-br !from-brand !to-accent"></b><i></i><i class="!w-1/2"></i></div>
                  <div class="preview-tile"><b class="!bg-gradient-to-br !from-white !to-slate-400"></b><i></i><i class="!w-4/5"></i></div>
                </div>
              </div>
            </div>

            <div class="orbit-panel side">
              <div class="deck-bar">
                <span class="text-xs text-slate-300 font-black">Pipeline</span>
              </div>
              @for (row of pipeline; track row.label) {
                <div class="side-row">
                  <span>{{ row.label }}</span>
                  <span class="status-chip">{{ row.status }}</span>
                </div>
              }
            </div>

            <div class="orbit-panel brief">
              <div class="deck-bar">
                <span class="text-xs text-slate-300 font-black">Brief parsed</span>
              </div>
              <div class="prompt-stack">
                @for (line of promptLines; track line) {
                  <span class="prompt-line">{{ line }}</span>
                }
              </div>
            </div>

            <div class="orbit-panel stats">
              <div class="deck-bar">
                <span class="text-xs text-slate-300 font-black">Launch telemetry</span>
              </div>
              <div class="metric-grid">
                @for (metric of heroMetrics; track metric.label) {
                  <div class="metric">
                    <b>{{ metric.value }}</b>
                    <span>{{ metric.label }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="dark-slab border-y border-white/10">
        <div class="max-w-7xl mx-auto px-6 py-10 proof-strip">
          @for (proof of proofPoints; track proof.label) {
            <div class="proof-cell">
              <b>{{ proof.value }}</b>
              <span>{{ proof.label }}</span>
            </div>
          }
        </div>
      </section>

      <section class="mad-universe-strip" aria-label="Explore the MAD Universe" data-section="mad-universe-marquee">
        <div class="mad-universe-inner">
          <p class="mad-universe-kicker"><span aria-hidden="true">*</span> The MAD Universe</p>
          <div class="mad-universe-marquee">
            <div class="mad-universe-track">
              @for (app of madUniverseApps.concat(madUniverseApps); track app.name + $index) {
                <a class="mad-universe-link" [href]="app.url" target="_blank" rel="noopener" [attr.aria-label]="app.name">
                  @if (app.logo) {
                    <img [src]="app.logo" [alt]="app.name" loading="lazy" decoding="async" />
                  } @else {
                    <span class="mad-universe-text">{{ app.name }}</span>
                  }
                </a>
              }
            </div>
          </div>
        </div>
      </section>

      <main class="light-band">
        <section class="max-w-7xl mx-auto px-6 py-24 lg:py-32 border-b border-slate-200">
          <div class="text-center max-w-3xl mx-auto mb-16">
            <span class="section-label justify-center">How it works</span>
            <h2 class="section-title mt-5">Brief. Generate. Deploy.</h2>
            <p class="mt-6 text-lg leading-8 text-slate-600">Three steps from client conversation to live website. No blank canvas, no template wrangling.</p>
          </div>
          <div class="grid md:grid-cols-3 gap-8">
            @for (step of howItWorks; track step.num) {
              <div class="text-center">
                <div class="mx-auto mb-5 w-14 h-14 rounded-full bg-gradient-to-br from-brand to-accent grid place-items-center text-white text-xl font-black">{{ step.num }}</div>
                <h3 class="text-lg font-black text-slate-950">{{ step.title }}</h3>
                <p class="mt-3 text-sm leading-7 text-slate-600">{{ step.body }}</p>
              </div>
            }
          </div>
        </section>

        <section class="max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div class="max-w-3xl">
            <span class="section-label">The better way to ship</span>
            <h2 class="section-title mt-5">
              Not a page builder. A client delivery machine.
            </h2>
            <p class="mt-6 text-lg leading-8 text-slate-600 max-w-2xl">
              The average site builder starts with an empty canvas. MADCreate starts
              with a working business system: tenant data, pages, theme tokens, forms,
              deployment, domain logic and analytics.
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-5 mt-14">
            @for (feature of features; track feature.title) {
              <article class="feature-card">
                <div class="feature-icon" [innerHTML]="feature.icon"></div>
                <h3 class="text-xl font-black text-slate-950">{{ feature.title }}</h3>
                <p class="mt-3 text-sm leading-7 text-slate-600">{{ feature.body }}</p>
              </article>
            }
          </div>
        </section>

        <section id="showcase" class="max-w-7xl mx-auto px-6 pb-24 lg:pb-32">
          <div class="grid lg:grid-cols-[0.76fr_1fr] gap-10 items-end mb-12">
            <div>
              <span class="section-label">Agency playbooks</span>
              <h2 class="section-title mt-5">Pick a vertical. Ship a system.</h2>
            </div>
            <p class="text-lg leading-8 text-slate-600">
              Every generated site is structured data, not hard-coded decoration.
              That means industry-specific sections, conversion copy and operational
              tools can be swapped in without rebuilding from scratch.
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-5">
            @for (playbook of playbooks; track playbook.title) {
              <article class="playbook-card" [style.--playbook-bg]="playbook.bg">
                <div class="playbook-body">
                  <span class="playbook-kicker">{{ playbook.kicker }}</span>
                  <div>
                    <div class="text-5xl mb-6" [innerHTML]="playbook.icon"></div>
                    <h3 class="text-2xl font-black">{{ playbook.title }}</h3>
                    <p class="mt-3 text-sm leading-7 text-white/78">{{ playbook.body }}</p>
                  </div>
                </div>
              </article>
            }
          </div>
        </section>

        <section id="pricing" class="dark-slab" data-section="pricing">
          <div class="max-w-7xl mx-auto px-6 py-24 lg:py-32">
            <div class="grid lg:grid-cols-[0.8fr_1fr] gap-12 items-start">
              <div>
                <span class="section-label !text-cyan-200">Plans &amp; Pricing</span>
                <h2 class="section-title mt-5 text-white">Start small. Scale the factory.</h2>
                <p class="mt-6 text-lg leading-8 text-slate-300">
                  Use the free plan for your first build, then unlock the client
                  delivery features when your pipeline starts moving.
                </p>
                <div class="mt-8 flex items-center gap-3">
                  <span [class.text-white]="!annualBilling()" [class.text-slate-400]="annualBilling()">Monthly</span>
                  <button type="button" role="switch" aria-label="Toggle annual billing" class="relative h-7 w-14 rounded-full border border-white/15 bg-white/10"
                    [attr.aria-checked]="annualBilling()" (click)="annualBilling.set(!annualBilling())">
                    <span class="absolute top-1 left-1 h-5 w-5 rounded-full bg-brand transition-transform"
                      [class.translate-x-7]="annualBilling()"></span>
                  </button>
                  <span [class.text-white]="annualBilling()" [class.text-slate-400]="!annualBilling()">Annual saves 25%</span>
                </div>
              </div>

              <div class="grid md:grid-cols-3 gap-5">
                @for (plan of plans; track plan.name) {
                  <article class="price-card" [class.featured]="plan.featured">
                    <div class="flex items-center justify-between gap-3">
                      <h3 class="text-xl font-black">{{ plan.name }}</h3>
                      @if (plan.featured) {
                        <span class="rounded-full bg-brand px-3 py-1 text-xs font-black text-slate-950">Popular</span>
                      }
                    </div>
                    <p class="mt-4 min-h-16 text-sm leading-7 text-slate-300">{{ plan.description }}</p>
                    <div class="mt-6">
                      @if (plan.price === 0) {
                        <span class="text-5xl font-black">Free</span>
                      } @else {
                        <span class="text-slate-300">R</span>
                        <span class="text-5xl font-black">{{ annualBilling() ? plan.annualPrice : plan.price }}</span>
                        <span class="text-slate-300">/mo</span>
                      }
                    </div>
                    <a [routerLink]="plan.name === 'Enterprise' ? '/contact' : '/register'"
                      class="mt-7 w-full text-center"
                      [class.mc-btn-primary]="plan.featured"
                      [class.mc-btn-secondary]="!plan.featured">
                      {{ plan.cta }}
                    </a>
                    <ul class="mt-8 space-y-3 text-sm text-slate-300">
                      @for (item of plan.features; track item) {
                        <li class="flex gap-3">
                          <i class="fa-solid fa-check mt-1 text-accent text-xs"></i>
                          <span>{{ item }}</span>
                        </li>
                      }
                    </ul>
                  </article>
                }
              </div>
            </div>
          </div>
        </section>

        <section id="faq" class="max-w-5xl mx-auto px-6 py-24 lg:py-32">
          <span class="section-label">Questions</span>
          <h2 class="section-title mt-5 mb-10">The practical bits.</h2>
          @for (faq of faqs; track faq.q) {
            <details class="faq-item">
              <summary>
                <span>{{ faq.q }}</span>
                <i class="fa-solid fa-plus text-teal-600"></i>
              </summary>
              <p>{{ faq.a }}</p>
            </details>
          }
        </section>

        <section class="final-cta">
          <div class="relative z-10 max-w-6xl mx-auto px-6 py-24 lg:py-32 text-center">
            <img src="/logo-wide-MADCreate.png" alt="MADCreate" class="mx-auto h-10 w-auto mb-10 invert brightness-0" />
            <h2 class="section-title text-white mx-auto max-w-4xl">
              Build the website business your clients think you already have.
            </h2>
            <p class="mt-6 text-lg leading-8 text-slate-300 max-w-2xl mx-auto">
              Open the studio, answer a brief, generate the first site, and walk
              into the client meeting with something they can actually click.
            </p>
            <div class="mt-10 flex flex-col sm:flex-row justify-center gap-3">
              <a routerLink="/register" class="mc-btn-primary !py-4 !px-8 text-base font-black">Generate your first site free</a>
              <a routerLink="/login" class="mc-btn-ghost !py-4 !px-8 text-base">Sign in to studio</a>
            </div>
          </div>
        </section>
      </main>

      <mc-marketing-footer />
    </div>
  `,
})
export class LandingPage {
  protected readonly madUniverseApps = MAD_UNIVERSE_APPS;
  protected readonly annualBilling = signal(false);

  protected readonly howItWorks = [
    { num: '1', title: 'Answer a brief', body: 'Fill in a short onboarding form with industry, tone, pages and calls-to-action. Takes under a minute.' },
    { num: '2', title: 'AI generates the site', body: 'MADCreate builds pages, sections, copy, SEO metadata and theme tokens from your brief — ready to preview in seconds.' },
    { num: '3', title: 'Deploy to a live domain', body: 'Connect a custom domain, pick a deployment path (internal, FTP, SFTP, Cloudflare) and push live with one click.' },
  ];

  protected readonly heroClaims = [
    'AI sections and copy',
    'Custom domains',
    'Tenant isolation',
    'Deploy paths included',
  ];

  protected readonly pipeline = [
    { label: 'Brand voice', status: 'Parsed' },
    { label: 'Pages', status: '7 generated' },
    { label: 'Theme tokens', status: 'Applied' },
    { label: 'Forms', status: 'Live' },
  ];

  protected readonly promptLines = [
    'Boutique law firm in Cape Town',
    'Premium, reassuring, conversion focused',
    'Home, services, attorneys, FAQ, contact',
    'Lead capture and WhatsApp handoff',
  ];

  protected readonly heroMetrics = [
    { value: '11', label: 'sections' },
    { value: '4', label: 'pages' },
    { value: '90s', label: 'brief to preview' },
  ];

  protected readonly proofPoints = [
    { value: '10x', label: 'faster first drafts for agency teams' },
    { value: '28', label: 'relational data models ready for scale' },
    { value: '1', label: 'platform for sites, tenants and domains' },
    { value: '0', label: 'blank canvases staring back at you' },
  ];

  protected readonly features = [
    {
      icon: '<i class="fa-solid fa-wand-magic-sparkles"></i>',
      title: 'Brief-to-site generation',
      body: 'Turn a short onboarding form into pages, sections, copy, SEO metadata and theme tokens that are ready to edit.',
    },
    {
      icon: '<i class="fa-solid fa-layer-group"></i>',
      title: 'Multi-tenant by default',
      body: 'Every client has isolated sites, themes, domains, members, leads and analytics inside the same operator studio.',
    },
    {
      icon: '<i class="fa-solid fa-route"></i>',
      title: 'Deployment paths included',
      body: 'Ship internally, export static builds, or push through FTP, SFTP and webhook adapters without reinventing release flow.',
    },
    {
      icon: '<i class="fa-solid fa-palette"></i>',
      title: 'Visual editing without drift',
      body: 'The builder edits structured sections and theme tokens, so the site stays consistent instead of becoming a pile of overrides.',
    },
    {
      icon: '<i class="fa-solid fa-plug"></i>',
      title: 'Integration catalog',
      body: 'Prepare client-ready installs for forms, payments, calendars, email, analytics, WhatsApp and business tooling.',
    },
    {
      icon: '<i class="fa-solid fa-shield-halved"></i>',
      title: 'Operator-grade controls',
      body: 'Super admin, audit logging, workspace roles, tenant routing and recovery scripts make it feel like a real SaaS product.',
    },
  ];

  protected readonly playbooks = [
    {
      kicker: 'Professional services',
      title: 'Trust-building sites for firms',
      body: 'Attorney, accounting and consulting layouts with credibility blocks, service pages, team sections and lead capture.',
      icon: '<i class="fa-solid fa-scale-balanced"></i>',
      bg: 'linear-gradient(135deg, #0f172a, #00C853 58%, #64DD17)',
    },
    {
      kicker: 'Local commerce',
      title: 'High-converting local brands',
      body: 'Restaurants, clinics, gyms and retailers with offers, galleries, menus, booking prompts and WhatsApp handoff.',
      icon: '<i class="fa-solid fa-store"></i>',
      bg: 'linear-gradient(135deg, #064e3b, #00C853 50%, #64DD17)',
    },
    {
      kicker: 'Portals and SaaS',
      title: 'Marketing plus logged-in app',
      body: 'Generate the public site first, then grow into dashboards, forms, workspaces, members and admin workflows.',
      icon: '<i class="fa-solid fa-laptop-code"></i>',
      bg: 'linear-gradient(135deg, #082f49, #00C853 48%, #00C853)',
    },
  ];

  protected readonly plans = [
    {
      name: 'Starter',
      price: 0,
      annualPrice: 0,
      featured: false,
      description: 'For validating the first site and learning the studio.',
      cta: 'Start free',
      features: ['1 workspace', '10 AI generations', 'Subdomain hosting', 'Visual builder', 'Basic analytics'],
    },
    {
      name: 'Agency',
      price: 799,
      annualPrice: 599,
      featured: true,
      description: 'For teams shipping client sites every month.',
      cta: 'Start trial',
      features: ['25 workspaces', '250 AI generations', 'Custom domains', 'Integration catalog', 'Audit logging', 'Priority support'],
    },
    {
      name: 'Enterprise',
      price: 2499,
      annualPrice: 1874,
      featured: false,
      description: 'For white-label operators and high-volume platforms.',
      cta: 'Talk to sales',
      features: ['Unlimited workspaces', 'Full white-label', 'SSO-ready architecture', 'Custom templates', 'SLA support'],
    },
  ];

  protected readonly faqs = [
    {
      q: 'Is this just another template builder?',
      a: 'No. MADCreate stores sites as structured schemas with tenants, themes, domains, forms and deployment records behind them. The AI creates editable product data, not a flattened static page.',
    },
    {
      q: 'Can agencies run multiple clients from one place?',
      a: 'Yes. That is the point. Each client can have separate tenants, domains, sites, leads, themes, members and usage limits while the operator keeps one central studio.',
    },
    {
      q: 'Can I use my own domain?',
      a: 'Yes. The platform is designed for custom domain routing and SSL workflows, with deployment adapters for practical hosting environments.',
    },
    {
      q: 'Do I need a developer to use it?',
      a: 'No for day-to-day site creation. Developers still have a real Angular, .NET Core and MSSQL stack underneath when the business needs custom work.',
    },
  ];
}
