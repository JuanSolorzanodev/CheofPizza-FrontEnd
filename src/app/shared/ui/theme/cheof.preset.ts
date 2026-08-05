import {
  definePreset,
} from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Preset visual principal de Cheo' F.
 *
 * Responsabilidades:
 * - paleta primaria;
 * - superficies claras y oscuras;
 * - colores semánticos;
 * - foco accesible.
 *
 * Los estilos estructurales de la aplicación se mantienen
 * fuera del preset, dentro de src/styles.
 */
const CheofPreset = definePreset(
  Aura,
  {
    semantic: {
      primary: {
        50: '#edf8f0',
        100: '#d9f0df',
        200: '#b5e1c2',
        300: '#88c99d',
        400: '#5daf78',
        500: '#379b59',
        600: '#287d45',
        700: '#23643a',
        800: '#1f5031',
        900: '#1b422a',
        950: '#0d2416',
      },

      colorScheme: {
        light: {
          surface: {
            0: '#ffffff',
            50: '#f8faf9',
            100: '#f1f5f2',
            200: '#e3e9e5',
            300: '#ced8d1',
            400: '#9baaa0',
            500: '#6c7c71',
            600: '#4d5c52',
            700: '#39463d',
            800: '#273129',
            900: '#182019',
            950: '#0d120e',
          },

          text: {
            color: '{surface.900}',
            secondaryColor: '{surface.700}',
            mutedColor: '{surface.600}',
          },
        },

        dark: {
          surface: {
            0: '#101511',
            50: '#151c17',
            100: '#1b241e',
            200: '#232e27',
            300: '#2d3a31',
            400: '#3c4b40',
            500: '#55665a',
            600: '#748579',
            700: '#9eada2',
            800: '#c3cec6',
            900: '#e2e9e4',
            950: '#f5f8f6',
          },

          text: {
            color: '{surface.950}',
            secondaryColor: '{surface.800}',
            mutedColor: '{surface.700}',
          },
        },
      },

      focusRing: {
        width: '2px',
        style: 'solid',
        color: '{primary.500}',
        offset: '2px',
      },
    },
  },
);

export default CheofPreset;
