import { BrowserRouter } from 'react-router-dom'

import { AppRouter } from './app/router'
import { OperationContextProvider } from './lib/store/operationContext'
import { AuthProvider } from './lib/auth/AuthProvider'

export default function App() {
  return (
    <AuthProvider>
      <OperationContextProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </OperationContextProvider>
    </AuthProvider>
  )
}
