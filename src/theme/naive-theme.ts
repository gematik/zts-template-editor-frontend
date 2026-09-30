
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

import type { GlobalThemeOverrides } from 'naive-ui';

export const appTheme: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0f1d65',
    primaryColorHover: '#138275',
    primaryColorPressed: '#093a6b',
    infoColor: '#009CA6',
    successColor: '#138275',
    borderRadius: '10px',
    borderColor: '#E6EDF0',
    cardColor: '#FFFFFF',
    textColorBase: '#0F172A',
    
    /* Improve contrast for accessibility */
    placeholderColor: 'rgba(115, 115, 115, 1)', 
    placeholderColorDisabled: 'rgba(170, 170, 170, 1.0)',
    inputColorDisabled: 'rgba(240, 240, 240, 0.2)',
  },
  Button: {
    borderRadiusMedium: '10px',
    heightMedium: '2rem',
    fontSizeMedium: '15px',
  },
  Input: {
    borderRadius: '10px',
    height: '2rem'
  },
  Card: {
    borderRadius: '12px',
    boxShadow: '0 8px 20px rgba(4,12,20,0.06)'
  }
};