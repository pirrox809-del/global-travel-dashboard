'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CloudSun, Euro, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { GlobeLogo } from '@/components/globe-logo';

/**
 * IntroScreen — the landing / hero screen shown on first visit.
 *
 * A full-screen editorial cover: a poetic one-liner, the product promise,
 * four feature pills, and a single call-to-action that reveals the dashboard.
 */
export function IntroScreen({ onEnter }: { onEnter: () => void }) {
  const { t } = useLanguage();

  const features = [
    { icon: <CloudSun className="size-5 text-amber-500" />, title: t('intro.feat.weather.title'), desc: t('intro.feat.weather.desc') },
    { icon: <Euro className="size-5 text-emerald-600" />, title: t('intro.feat.exchange.title'), desc: t('intro.feat.exchange.desc') },
    { icon: <ShieldCheck className="size-5 text-rose-500" />, title: t('intro.feat.advisory.title'), desc: t('intro.feat.advisory.desc') },
    { icon: <Sparkles className="size-5 text-violet-500" />, title: t('intro.feat.curated.title'), desc: t('intro.feat.curated.desc') },
  ];

  return (
    <motion.div
      key="intro"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      className="relative z-10 flex min-h-screen flex-col"
    >
      {/* Floating controls top-right */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-6 sm:top-6">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      {/* Centered hero content */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        {/* Minimalist globe mark — hand-drawn line art, monochrome, no gradient */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-8 text-foreground"
        >
          <GlobeLogo size={64} animated className="text-foreground" />
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Badge variant="outline" className="mb-6 gap-1.5 bg-background/60 px-3 py-1 text-xs backdrop-blur-md">
            <Sparkles className="size-3 text-amber-500" />
            {t('intro.badge')}
          </Badge>
        </motion.div>

        {/* Title — two-line gradient */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="text-balance text-5xl font-bold tracking-tighter text-foreground sm:text-7xl lg:text-8xl"
        >
          <span className="block">{t('intro.title1')}</span>
          <span className="block text-muted-foreground">
            {t('intro.title2')}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-xl text-balance text-lg font-light text-foreground/80 sm:text-xl"
        >
          {t('intro.subtitle')}
        </motion.p>

        {/* Body */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base"
        >
          {t('intro.body')}
        </motion.p>

        {/* Feature pills — 2x2 grid on mobile, 4-col on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.7 + i * 0.08, ease: 'easeOut' }}
            >
              <Card className="h-full border-border/40 bg-card/50 backdrop-blur-md">
                <CardContent className="flex flex-col items-center gap-2 px-3 py-4 text-center">
                  <div className="grid size-10 place-items-center rounded-xl bg-background/60 ring-1 ring-border/40">
                    {f.icon}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold leading-tight">{f.title}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12"
        >
          <Button
            size="lg"
            onClick={onEnter}
            className="group h-12 gap-2 rounded-full border border-border/60 bg-background/60 px-8 text-base font-medium text-foreground backdrop-blur-md transition-all hover:border-foreground/30 hover:bg-foreground hover:text-background"
          >
            {t('intro.cta')}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.2 }}
          className="mt-6 text-[11px] text-muted-foreground/70"
        >
          {t('intro.hint')}
        </motion.p>
      </div>
    </motion.div>
  );
}
