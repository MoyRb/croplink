export type Option = {
  id: string
  name: string
}

export type CropContext = {
  name: string
  seasons?: string[]
  sectors?: string[]
  tunnels?: string[]
  valves?: string[]
}

export type RanchContext = Option & {
  crops: CropContext[]
}

export type ProducerContext = Option & {
  ranches: RanchContext[]
}

export const operationContexts: ProducerContext[] = [
  {
    id: 'prod-1',
    name: 'Agrícola Los Pinos',
    ranches: [
      {
        id: 'ran-1',
        name: 'Rancho El Roble',
        crops: [
          {
            name: 'Arándano',
            seasons: ['2024-2025', '2025-2026'],
            sectors: ['Sector Norte', 'Sector Sur'],
            tunnels: ['Túnel A1', 'Túnel A2'],
            valves: ['Válvula 1', 'Válvula 2'],
          },
          {
            name: 'Fresa',
            seasons: ['2025'],
            sectors: ['Sector Este'],
            tunnels: ['Túnel B1'],
            valves: ['Válvula 3'],
          },
        ],
      },
      {
        id: 'ran-2',
        name: 'Rancho San Miguel',
        crops: [
          {
            name: 'Frambuesa',
            seasons: ['2025'],
            sectors: ['Sector Loma'],
            tunnels: ['Túnel C4'],
            valves: ['Válvula 8', 'Válvula 9'],
          },
        ],
      },
    ],
  },
  {
    id: 'prod-2',
    name: 'Campos de Occidente',
    ranches: [
      {
        id: 'ran-3',
        name: 'Rancho La Esperanza',
        crops: [
          {
            name: 'Zarzamora',
            seasons: ['2024-2025'],
            sectors: ['Sector Central'],
            tunnels: ['Túnel D2', 'Túnel D3'],
            valves: ['Válvula 4'],
          },
          {
            name: 'Arándano',
            seasons: ['2025-2026'],
            sectors: ['Sector Alto'],
            tunnels: ['Túnel E1'],
            valves: ['Válvula 10'],
          },
        ],
      },
    ],
  },
]
