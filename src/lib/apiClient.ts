export const apiClient = {
  get: async <T>(path: string): Promise<T> => {
    void path
    await new Promise((resolve) => setTimeout(resolve, 200))
    return Promise.resolve({} as T)
  },
  post: async <T>(path: string, payload: unknown): Promise<T> => {
    void path
    void payload
    await new Promise((resolve) => setTimeout(resolve, 200))
    return Promise.resolve({} as T)
  },
}
