// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import PollutantFingerprintPanel from '../PollutantFingerprintPanel';

const meta: Meta<typeof PollutantFingerprintPanel> = {
  title: 'AeroSense/PollutantFingerprintPanel',
  component: PollutantFingerprintPanel,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof PollutantFingerprintPanel>;

export const Default: Story = {
  args: {
    currentData: {
      aqi: 82,
      category: '中等',
      dominantPollutant: 'pm25',
      pollutants: [
        {
          code: 'pm25',
          displayName: 'PM2.5',
          fullName: '細懸浮微粒',
          concentration: { value: 42, units: 'µg/m³' },
        },
        {
          code: 'pm10',
          displayName: 'PM10',
          fullName: '懸浮微粒',
          concentration: { value: 68, units: 'µg/m³' },
        },
        {
          code: 'o3',
          displayName: 'O3',
          fullName: '臭氧',
          concentration: { value: 85, units: 'ppb' },
        },
        {
          code: 'no2',
          displayName: 'NO2',
          fullName: '二氧化氮',
          concentration: { value: 45, units: 'ppb' },
        },
        {
          code: 'so2',
          displayName: 'SO2',
          fullName: '二氧化硫',
          concentration: { value: 18, units: 'ppb' },
        },
      ],
      timestamp: new Date().toISOString(),
      location: { lat: 25.03, lng: 121.56 },
    },
    forecastData: {
      hourlyForecasts: Array.from({ length: 12 }).map((_, index) => ({
        dateTime: new Date(Date.now() + index * 60 * 60 * 1000).toISOString(),
        indexes: [{ code: 'uaqi', aqi: 70 + index * 2, category: '中等', dominantPollutant: 'pm25' }],
        pollutants: [
          {
            code: 'pm25',
            displayName: 'PM2.5',
            concentration: { value: 38 + index, units: 'µg/m³' },
          },
          {
            code: 'pm10',
            displayName: 'PM10',
            concentration: { value: 60 + index * 0.8, units: 'µg/m³' },
          },
          {
            code: 'o3',
            displayName: '臭氧',
            concentration: { value: 80 - index, units: 'ppb' },
          },
        ],
      })),
      location: { latitude: 25.03, longitude: 121.56 },
    },
  },
};
