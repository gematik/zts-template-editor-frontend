/*
 * Copyright (Change Date see Readme), gematik GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ******
 *
 * For additional notes and disclaimer from gematik and in case of changes
 * by gematik, find details in the "Readme" file.
 */

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import '@/assets/css/style.css';
import naive from 'naive-ui';
import { runtimeConfig } from './config';
import { logger } from './utils/logger';

const appLogger = logger.scope('app-bootstrap');

appLogger.info('The Frontend is initializing.', {
  debugLoggingEnabled: runtimeConfig.BROWSER_DEBUG_LOGS,
  ztsUrl: runtimeConfig.ZTS_URL,
});
appLogger.debug('The router and Naive UI are registered.');

const app = createApp(App);
app.use(router);
app.use(naive);
app.mount('#app');


appLogger.info('Frontend successfully mounted.');
