import type { CheckDef } from '../types'
import { performanceCwvChecks } from './06-performance-cwv'
import { performanceHtmlChecks } from './06-performance-html'

const byId = new Map([...performanceCwvChecks, ...performanceHtmlChecks].map((c) => [c.id, c]))

const ORDER = [
  'perf.lcp',
  'perf.html-size',
  'perf.cls',
  'perf.ttfb',
  'perf.compression',
  'perf.cache',
  'perf.http2',
  'perf.img-dims',
  'perf.lazy',
  'perf.lcp-lazy',
  'perf.dom',
  'perf.unused-js',
  'perf.inp',
  'perf.lazy-video',
  'perf.preconnect',
  'perf.crux',
]

export const performanceChecks: CheckDef[] = ORDER.map((id) => byId.get(id)!)
