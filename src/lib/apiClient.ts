export const apiClient = {
  get: async <T>(path: string): Promise<T> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return Promise.resolve({} as T)
  },
  post: async <T>(path: string, payload: unknown): Promise<T> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return Promise.resolve({} as T)
  },
}
