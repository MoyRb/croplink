export const apiClient = {
  get: async <T>(_path: string): Promise<T> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return Promise.resolve({} as T)
  },
  post: async <T>(_path: string, _payload: unknown): Promise<T> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return Promise.resolve({} as T)
  },
}
