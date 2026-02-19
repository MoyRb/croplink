import { BrowserRouter } from 'react-router-dom'

import { AppRouter } from './app/router'
import { OperationContextProvider } from './lib/store/operationContext'

export default function App() {
  return (
    <OperationContextProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </OperationContextProvider>
  )
}
