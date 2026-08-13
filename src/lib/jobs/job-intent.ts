/* Noise gate for conversational job feeds (e.g. Facebook groups).
 * Decides whether a post is actually a job posting ("looking for", "hiring", …)
 * instead of memes/chatter that happen to mention work-adjacent words. */

export function isJobPosting(text: string): boolean {
  const t = (text || "").toLowerCase();
  if (t.length < 12) return false;

  // Hard negatives: clearly not a job.
  const neg = /\b(merry christmas|happy new year|happy birthday|good morning|good evening|good night|sale now|promo|free (shopping|gift|sample)|weight loss|diet plan|investment (advice|tips)|for sale|spam)\b/;
  if (neg.test(t)) return false;

  const intent: RegExp[] = [
    /\b(hiring|hiring now|we are hiring|urgently hiring|now hiring|open(ing| position| role)|vacanc|job posting|we have a (vacancy|position|opening))\b/,
    /\b(looking for|we (are|\'re) looking|we need|we want|need a|need an|seeking|wanted|looking for a)\b/,
    /\b(virtual assistant|\bva\b|data entry|admin(istrative)? assistant|bookkeep|accountant|customer (service|support)|cold call|appointment setter|telemarketing|social media (manager|specialist)|content writer|video editor|graphic designer)\b/,
    /\b(work from home|remote|wfh|online job|part[- ]?time|full[- ]?time|freelance)\b/,
    /\b(send (your )?(cv|resume)|dm me|pm me|message me|inbox me|apply|interested|salary|rate|per hour|budget|compensation|paid)\b/,
  ];

  return intent.some((re) => re.test(t));
}
