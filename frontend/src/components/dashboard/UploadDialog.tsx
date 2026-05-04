import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUpload } from '@/hooks/useTransactions'
import type { Account, UploadResult } from '@/types'

interface UploadDialogProps {
  account: Account | null
  onClose: () => void
}

export default function UploadDialog({ account, onClose }: UploadDialogProps) {
  const [bank, setBank] = useState<string>('auto')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const upload = useUpload(account?.id ?? 0)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
  })

  const handleUpload = async () => {
    if (!file || !account) return
    try {
      const res = await upload.mutateAsync({ file, bank: bank === 'auto' ? undefined : bank })
      setResult(res)
      toast.success(`${res.insertadas} transacciones nuevas importadas`)
    } catch (err: unknown) {
      const axiosDetail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      const detail = axiosDetail ?? (err instanceof Error ? err.message : 'Error desconocido')
      toast.error(`Error: ${detail}`)
    }
  }

  const handleClose = () => {
    setFile(null)
    setResult(null)
    setBank('auto')
    onClose()
  }

  return (
    <Dialog open={!!account} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar extracto bancario</DialogTitle>
          <DialogDescription>
            {account?.nombre} — {account?.banco || 'Banco desconocido'}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">Importación completada</p>
                <p className="text-sm text-green-700">
                  Banco detectado: <strong>{result.banco_detectado.toUpperCase()}</strong>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{result.total_csv}</p>
                <p className="text-xs text-gray-500">Total CSV</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{result.insertadas}</p>
                <p className="text-xs text-gray-500">Nuevas</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700">{result.duplicadas}</p>
                <p className="text-xs text-gray-500">Duplicadas</p>
              </div>
            </div>
            {result.auto_categorized > 0 && (
              <p className="text-sm text-blue-600 text-center">
                ✓ {result.auto_categorized} transacciones categorizadas automáticamente
              </p>
            )}
            <Button className="w-full" onClick={handleClose}>Cerrar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Banco</Label>
              <Select value={bank} onValueChange={setBank}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detectar</SelectItem>
                  <SelectItem value="n26">N26 (CSV)</SelectItem>
                  <SelectItem value="santander">Santander (Excel)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              } ${file ? 'border-green-400 bg-green-50' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              {file ? (
                <p className="text-sm font-medium text-green-700">{file.name}</p>
              ) : isDragActive ? (
                <p className="text-sm text-blue-600">Suelta el fichero aquí</p>
              ) : (
                <p className="text-sm text-gray-500">
                  Arrastra un CSV o Excel aquí, o haz clic para seleccionar
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Cancelar</Button>
              <Button
                className="flex-1"
                disabled={!file || upload.isPending}
                onClick={handleUpload}
              >
                {upload.isPending ? 'Procesando...' : 'Importar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
