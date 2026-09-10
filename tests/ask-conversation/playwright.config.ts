import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'*.spec.ts',outputDir:join(tmpdir(), 'wops-ask-conversation-browser'),timeout:30000,workers:1,use:{baseURL:'http://127.0.0.1:3016',screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}]});
