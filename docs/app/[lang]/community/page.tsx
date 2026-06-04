import { LandingNav } from '@/components/landing/LandingNav';
import { buildMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

const i18n = {
  en: {
    title: 'Internal Support',
    desc: 'TestTeam DBX is maintained for internal use. Use TestTeam internal channels for support, releases, and operational questions.',
  },
  cn: {
    title: '内部支持',
    desc: 'TestTeam DBX 按内部工具维护。支持、发布和运维问题请走 TestTeam 内部渠道。',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === 'cn' ? 'cn' : 'en';
  const t = i18n[l];

  return buildMetadata({
    title: t.title,
    description: t.desc,
    path: `/${l}/community`,
    lang: l,
  });
}

export default async function CommunityPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l = lang === 'cn' ? 'cn' : 'en';
  const t = i18n[l];

  return (
    <div className="min-h-screen bg-[#0b1120] text-landing-ink">
      <LandingNav lang={l} active="community" />
      <div className="max-w-[860px] mx-auto px-6 pt-32 pb-24">
        <h1 className="text-4xl font-[820] tracking-tight">{t.title}</h1>
        <p className="mt-3 text-landing-muted text-lg">{t.desc}</p>
      </div>
    </div>
  );
}
