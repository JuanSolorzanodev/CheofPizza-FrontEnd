import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const CheofPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '#EBF5EE',
      100: '#D7EBDE',
      200: '#B9DCC5',
      300: '#9BCDAC',
      400: '#69B482',
      500: '#379B59', // Verde Cheo'F (primary)
      600: '#328C50',
      700: '#297443',
      800: '#215D35',
      900: '#194628',
      950: '#112F1B'
    },

    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b'
        },

        // ✅ IMPORTANTÍSIMO: texto en LIGHT
        text: {
          color: '{surface.900}',
          secondaryColor: '{surface.600}',
          mutedColor: '{surface.500}'
        }
      },

      dark: {
        surface: {
          0: '#131629ff',
          50: '#0f1511',
          100: '#141b16',
          200: '#1a221c',
          300: '#212b24',
          400: '#2a372e',
          500: '#36473c',
          600: '#4b6353',
          700: '#668670',
          800: '#8fb59a',
          900: '#c6e7d2',
          950: '#eaf7ef'
        },

        // ✅ IMPORTANTÍSIMO: texto en DARK
        text: {
          color: '{surface.950}',
          secondaryColor: '{surface.900}',
          mutedColor: '{surface.800}'
        },

      }
    },

    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.500}',
      offset: '2px'
    }
  },

  extend: {
    cheof: {
      brand: {
        red: '#E41F1E',
        green: '#379B59',
        white: '#FFFFFF'
      }
    }
  },

  css: ({ dt }) => `
    /* =========================================================
      ✅ “Seguro” de texto global:
      Fuerza variables de texto para que TODOS los componentes
      (incluido p-dialog) tengan contraste correcto.
      ========================================================= */
    :root {
      --p-text-color: ${dt('colorScheme.light.text.color')};
      --p-text-color-secondary: ${dt('colorScheme.light.text.secondaryColor')};
      --p-text-muted-color: ${dt('colorScheme.light.text.mutedColor')};
      /* ✅ Exporta marca a CSS variables */
      --cheof-red: ${dt('cheof.brand.red')};
      --cheof-green: ${dt('cheof.brand.green')};
      --cheof-white: ${dt('cheof.brand.white')};

    }

    html.cheof-dark {
      --p-text-color: ${dt('colorScheme.dark.text.color')};
      --p-text-color-secondary: ${dt('colorScheme.dark.text.secondaryColor')};
      --p-text-muted-color: ${dt('colorScheme.dark.text.mutedColor')};
      --cheof-red: ${dt('cheof.brand.red')};
      --cheof-green: ${dt('cheof.brand.green')};
      --cheof-white: ${dt('cheof.brand.white')};
    }

    /* Marca */
    .cheof-title {
      color: ${dt('cheof.brand.red')};
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .cheof-accent-line {
      height: 4px;
      border-radius: 999px;
      background: linear-gradient(
        90deg,
        ${dt('cheof.brand.green')} 0 33%,
        ${dt('cheof.brand.white')} 33% 66%,
        ${dt('cheof.brand.red')} 66% 100%
      );
    }

    .p-button.p-button-cheof-red {
      background: ${dt('cheof.brand.red')};
      border-color: ${dt('cheof.brand.red')};
      color: #fff;
    }
    .p-button.p-button-cheof-red:not(:disabled):hover {
      filter: brightness(0.95);
    }

    /* ========== Botones de marca (reutilizables) ========== */
    .p-button.cheof-btn {
      border-radius: 999px;
      font-weight: 600;
      border-width: 1px;
    }

    .p-button.cheof-btn--primary {
      background: ${dt('cheof.brand.green')};
      border-color: ${dt('cheof.brand.green')};
      color: #fff;
    }
    .p-button.cheof-btn--primary:not(:disabled):hover {
      filter: brightness(0.95);
    }

    .p-button.cheof-btn--danger {
      background: ${dt('cheof.brand.red')};
      border-color: ${dt('cheof.brand.red')};
      color: #fff;
    }
    .p-button.cheof-btn--danger:not(:disabled):hover {
      filter: brightness(0.95);
    }

    .p-button.cheof-btn--outlined {
      background: transparent;
      border-color: ${dt('cheof.brand.green')};
      color: ${dt('cheof.brand.green')};
    }
    .p-button.cheof-btn--outlined .p-button-icon {
      color: ${dt('cheof.brand.green')};
    }

    /* Dark mode: outlined más visible */
    html.cheof-dark .p-button.cheof-btn--outlined {
      background: color-mix(in srgb, ${dt('cheof.brand.green')} 10%, transparent);
      border-color: color-mix(in srgb, ${dt('cheof.brand.green')} 65%, transparent);
      color: ${dt('colorScheme.dark.surface.950')};
    }
    html.cheof-dark .p-button.cheof-btn--outlined .p-button-icon {
      color: ${dt('colorScheme.dark.surface.950')};
    }

    /* Chips */
    .cheof-badge {
      display: inline-flex;
      align-items: center;
      gap: .5rem;
      padding: .45rem .75rem;
      border-radius: 999px;
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
      border: 1px solid var(--p-surface-200);
      background: var(--p-surface-0);
    }

    .cheof-badge--simple {
      color: ${dt('cheof.brand.green')};
    }

    .cheof-badge--special {
      color: ${dt('cheof.brand.red')};
    }
  `
});

export default CheofPreset;
