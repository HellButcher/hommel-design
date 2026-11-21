import { definePreviewAddon } from 'storybook/internal/csf';
import addonAnnotations from './preview.ts';

export default () => definePreviewAddon(addonAnnotations);
