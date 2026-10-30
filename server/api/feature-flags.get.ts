import { getAllFeatureFlags } from '../utils/feature-flags';

export default defineEventHandler(() => getAllFeatureFlags());
