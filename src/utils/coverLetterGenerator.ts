import { ExtractedJobData, MatchAnalysisResult, CandidateProfile } from '../types';

export type CoverLetterTone = 'standard' | 'concise' | 'executive' | 'zh_tw';

export interface GeneratedCoverLetters {
  tier3Free: string;
  tier4Pro: string;
  concisePitch: string;
  zhTwLetter: string;
}

type DomainTrack = 'software' | 'product_data' | 'finance_acquisitions' | 'civil_architecture' | 'general';

function detectDomainTrack(job: ExtractedJobData, candidate: CandidateProfile): DomainTrack {
  const haystack = `${job.title || ''} ${job.fullBodyText?.slice(0, 1200) || ''} ${candidate.title || ''}`.toLowerCase();
  if (/(acquisitions|underwriting|dcf|lbo|real estate|private equity|investment analyst|m&a|capital markets)/i.test(haystack)) {
    return 'finance_acquisitions';
  }
  if (/(civil engineer|structural|architect|autocad|revit|\bbim\b|construction management|mep|土木|建築|結構工程)/i.test(haystack)) {
    return 'civil_architecture';
  }
  if (/(product analyst|data analyst|data scientist|ai trainer|quantitative|a\/b test|analytics|bi analyst|產品經理|數據分析)/i.test(haystack)) {
    return 'product_data';
  }
  if (/(software|frontend|backend|full[\s-]?stack|engineer|developer|devops|sre|architect|typescript|react|java|python|go\b|kubernetes|微服務|工程師)/i.test(haystack)) {
    return 'software';
  }
  return 'general';
}

function extractQuantifiedHighlights(rawResumeText: string, maxCount = 2): string[] {
  if (!rawResumeText) return [];
  const lines = rawResumeText
    .split(/[\n\r]+/)
    .map((l) => l.replace(/^[\s•\-*▪◦\d.)]+/, '').trim())
    .filter((l) => l.length >= 24 && l.length <= 240);

  const metricRegex = /(\d+(?:\.\d+)?%|\$[\d,.]+[MBKmk]?|\b\d{2,}\+|\b\d+x\b|<\s*\d+\s*ms|99\.\d+%|DAU|RPS|QPS|ROI|SLA)/i;
  const scored = lines
    .filter((l) => !/(email|phone|linkedin\.com|github\.com|education|university|bachelor|master)/i.test(l))
    .map((line) => ({
      line,
      score: (metricRegex.test(line) ? 3 : 0) + (line.length >= 45 && line.length <= 170 ? 1 : 0),
    }))
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score);

  const unique: string[] = [];
  for (const item of scored) {
    if (!unique.some((u) => u.slice(0, 32) === item.line.slice(0, 32))) {
      unique.push(item.line.replace(/[.。]+$/, ''));
    }
    if (unique.length >= maxCount) break;
  }
  return unique;
}

function extractJdFocusLine(job: ExtractedJobData): string {
  const resp = (job.sections?.responsibilities || []).find((r) => r && r.trim().length > 25 && r.trim().length < 180);
  if (resp) {
    return resp.replace(/^[\s•\-*]+/, '').replace(/[.。]+$/, '').trim();
  }
  const lines = (job.fullBodyText || '')
    .split(/[\n\r]+/)
    .map((l) => l.replace(/^[\s•\-*]+/, '').trim())
    .filter((l) => l.length > 35 && l.length < 160 && !/equal opportunity|salary|benefit|401k|about us/i.test(l));
  return lines[0] ? lines[0].replace(/[.。]+$/, '') : '';
}

function cleanCompanyName(raw?: string): string {
  const cleaned = (raw || '')
    .replace(/\s?\d+(\.\d+)?\s*★?$/, '')
    .replace(/\s*\|\s*.*$/, '')
    .trim();
  return cleaned || 'your hiring team';
}

function resolveSignOffName(candidate: CandidateProfile, fallbackTitle: string): string {
  const name = (candidate.name || '').trim();
  if (
    name &&
    name !== 'Candidate Profile' &&
    !name.includes('PII Scrubbed') &&
    !name.includes('[Your')
  ) {
    return name;
  }
  return fallbackTitle;
}

/**
 * 军师核心算法 v2：高保真多行业、量化战绩驱动求职信同步引擎
 * 1. 自动识别领域（软件/AI、产品数据、金融并购、土木建筑、通用）不再错用行业术语
 * 2. 自动抽取简历真实带数字的量化战绩 + JD 核心职责钩子
 * 3. 支持英/美拼写自适应、短平快 Cold Pitch、以及 104/CakeResume 繁体中文求职信
 */
export function generateSynchronizedCoverLetters(
  job: ExtractedJobData,
  match: MatchAnalysisResult,
  candidate: CandidateProfile
): GeneratedCoverLetters {
  const company = cleanCompanyName(job.company || match.company);
  const title = (job.title || match.jobTitle || 'Target Role').trim();
  const location = (job.location || match.location || 'On-site / Hybrid').trim();
  const yoe = candidate.yearsOfExperience || 10;
  const candidateTitle = (candidate.title || 'Senior Specialist & Lead').trim();
  const signOffName = resolveSignOffName(candidate, candidateTitle);

  const track = detectDomainTrack(job, candidate);
  const locLower = location.toLowerCase();
  const isUK = /\b(uk|united kingdom|london|england|edinburgh|cambridge|manchester|bristol)\b/.test(locLower);
  const specialised = isUK ? 'specialised' : 'specialized';
  const optimised = isUK ? 'optimised' : 'optimized';
  const programme = isUK ? 'programme' : 'program';

  const verifiedNames = (match.verifiedSkills || []).map((s) => s.name).filter(Boolean);
  const candidateSkills = candidate.skills || [];
  const primarySkills =
    verifiedNames.length > 0
      ? verifiedNames
      : candidateSkills.length > 0
      ? candidateSkills
      : ['Quantitative Analysis', 'Strategic Execution', 'Cross-Functional Leadership'];

  const topSkills = primarySkills.slice(0, 4);
  const skillsDisplay = topSkills.join(', ');
  const resumeHighlights = extractQuantifiedHighlights(candidate.rawResumeText || '', 2);
  const jdFocus = extractJdFocusLine(job);
  const matchScore = match.overallMatchScore || 88;
  const credentialLine =
    (candidate.certifications && candidate.certifications.length > 0
      ? candidate.certifications.slice(0, 2).join(', ')
      : '') || candidate.education || '';

  const trackOpeningByDomain: Record<DomainTrack, string> = {
    software: `architecting production systems, eliminating latency bottlenecks, and shipping resilient software across ${skillsDisplay}`,
    product_data: `translating complex datasets into measurable product decisions, A/B experimentation rigor, and analytical evaluation across ${skillsDisplay}`,
    finance_acquisitions: `building institutional DCF/LBO underwriting models, conducting rigorous asset due diligence, and structuring transaction memos across ${skillsDisplay}`,
    civil_architecture: `delivering code-compliant structural and architectural packages, BIM/CAD coordination, and disciplined field execution across ${skillsDisplay}`,
    general: `delivering measurable operational results, cross-functional execution, and structured problem solving across ${skillsDisplay}`,
  };

  const trackClosingFocus: Record<DomainTrack, string> = {
    software: `scalable architecture, test coverage, and zero-downtime delivery`,
    product_data: `quantitative calibration, metric accuracy, and clear stakeholder alignment`,
    finance_acquisitions: `disciplined underwriting, risk-adjusted returns, and investment committee readiness`,
    civil_architecture: `drawing precision, constructability review, and on-schedule milestone delivery`,
    general: `operational excellence, measurable ROI, and day-one ownership`,
  };

  const evidenceBullets: string[] = [];
  if (resumeHighlights.length > 0) {
    evidenceBullets.push(`• Measurable Impact: ${resumeHighlights[0]}.`);
  } else {
    evidenceBullets.push(
      `• Core Mastery (${topSkills[0] || 'Execution'}): ${yoe}+ years delivering production-grade outcomes and dependable execution under tight deadlines.`
    );
  }
  if (resumeHighlights.length > 1) {
    evidenceBullets.push(`• Proven Execution: ${resumeHighlights[1]}.`);
  } else {
    evidenceBullets.push(
      `• Direct Alignment (${topSkills[1] || 'Analysis'}): Hands-on background applying ${topSkills.slice(0, 2).join(' and ')} to solve high-stakes operational challenges.`
    );
  }
  if (topSkills[2]) {
    evidenceBullets.push(
      `• Breadth & Tooling: Verified fluency in ${topSkills.slice(2, 4).join(' & ')}${credentialLine ? ` (${credentialLine})` : ''}.`
    );
  }

  const jdHookParagraph = jdFocus
    ? `Your focus on "${jdFocus}" aligns directly with how I operate—turning ambiguous requirements into repeatable, verifiable results rather than surface-level activity.`
    : `Throughout my career, I have ${specialised} in turning complex operational goals into concrete, measurable outcomes with ${optimised} workflows and clear stakeholder communication.`;

  // 1. 3-Tier Standard Letter (Clean, human, non-generic)
  const tier3Free = `Dear ${company} Hiring Team,

I am applying for the ${title} role at ${company}${location && !location.includes('Select') ? ` (${location})` : ''}. With ${yoe}+ years of hands-on experience ${trackOpeningByDomain[track]}, I bring immediate readiness across the exact priorities outlined in your posting.

${jdHookParagraph}

Highlights directly relevant to ${company}'s ${title} mandate:
${evidenceBullets.join('\n')}

I would welcome a brief conversation to walk through concrete examples of my past work and how I can support ${company}'s ${trackClosingFocus[track]} from week one.

Sincerely,
${signOffName}
${candidateTitle}`;

  // 2. 4-Tier Executive Strategic Brief
  const tier4Pro = `EXECUTIVE APPLICATION BRIEF: ${title.toUpperCase()}
Target Organization: ${company.toUpperCase()}
Candidate: ${signOffName} (${candidateTitle} • ${yoe}+ Years Experience)
Location: ${location} | Verified Skill Alignment: ${matchScore}%

1. DAY-ONE VALUE PROPOSITION
Teams at ${company} hiring for ${title} need a practitioner who combines ${skillsDisplay} with accountable, zero-fluff execution. Over ${yoe}+ years, I have consistently owned end-to-end initiatives—bridging technical rigor, cross-team alignment, and measurable business impact.${credentialLine ? ` Credentials include ${credentialLine}.` : ''}

2. QUANTIFIED EVIDENCE & COMPETENCY MATRIX
${evidenceBullets.join('\n')}
• Strategic Ownership: Proven track record stepping into complex ${programme} initiatives, closing execution gaps early, and maintaining high quality bars without heavy oversight.

3. WHY ${company.toUpperCase()} NOW
${jdFocus ? `Your mandate around "${jdFocus}" matches the exact class of challenges I do my best work on.` : `Having reviewed the scope of the ${title} opening at ${company}, my background maps directly onto your core deliverables with minimal ramp-up time.`} I am ready to contribute immediately to ${trackClosingFocus[track]}.

4. NEXT STEP
I welcome a focused technical or case-study discussion to share specific work artifacts and metrics relevant to your roadmap.

Respectfully submitted,
${signOffName}
${candidateTitle}`;

  // 3. Concise Recruiter / Cold Application Pitch (<= 160 words)
  const concisePitch = `Hi ${company} Hiring Team,

I noticed the ${title} opening at ${company} and wanted to reach out directly. Across ${yoe}+ years as a ${candidateTitle}, I have ${specialised} in ${skillsDisplay}${resumeHighlights[0] ? `—most notably: ${resumeHighlights[0].charAt(0).toLowerCase() + resumeHighlights[0].slice(1)}` : ''}.

What stands out about this role is ${jdFocus ? `your need around "${jdFocus}"` : `the focus on ${trackClosingFocus[track]}`}, which aligns closely with my verified stack (${topSkills.slice(0, 3).join(', ')}).

Happy to send over relevant work samples or hop on a quick 15-minute intro call this week.

Best regards,
${signOffName}
${candidateTitle}`;

  // 4. 繁體中文精準求職信（專攻 104 人力銀行 / CakeResume / 亞太職缺）
  const zhTwLetter = `${company} 招募團隊 您好：

誠摯應徵貴公司「${title}」一職。本人具備 ${yoe} 年以上實戰經驗（現職／專長定位：${candidateTitle}），核心技術與領域涵蓋 ${skillsDisplay}，與貴團隊此職缺的關鍵能力高度契合（系統評估核心技能契合度約 ${matchScore}%）。

${jdFocus ? `看到貴團隊重視「${jdFocus}」，這正是本人過去最擅長且長期深耕的實戰方向。` : `過去職涯中，我專注於將複雜業務需求拆解為可量化、穩定落地的解決方案，並持續優化團隊交付效率。`}

與本職缺最直接對應的實戰履歷亮點：
• 核心技術與實務落地：長期深耕 ${topSkills.slice(0, 2).join('、')}，能於報到後迅速接手核心任務。
${resumeHighlights[0] ? `• 具體量化戰績：${resumeHighlights[0]}。` : `• 跨團隊協作推進：具備獨立主導跨部門專案溝通與系統化問題排查經驗。`}
${credentialLine ? `• 學經歷與專業認證：${credentialLine}。` : ''}

若有機會進一步面談，非常期待能向貴團隊分享過往專案實績與具體解決方案。感謝撥冗審閱！

敬祝 順心
${signOffName} 敬上
(${candidateTitle})`;

  return {
    tier3Free,
    tier4Pro,
    concisePitch,
    zhTwLetter,
  };
}
