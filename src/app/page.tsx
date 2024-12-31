'use client'

import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { QRCodeSVG } from 'qrcode.react'

interface CameraSettings {
  brightness: number
}

// Druckformate in Millimetern (4x6 Zoll)
const PRINT_SIZES = {
  width: 152.4, // 6 Zoll in mm
  height: 101.6 // 4 Zoll in mm
}

// Seitenverhältnis für 4x6 Format
const ASPECT_RATIO = PRINT_SIZES.width / PRINT_SIZES.height

interface BookingOptions {
  printOption: boolean
  premiumOption: boolean
}

interface ContactInfo {
  name: string
  email: string
  phone: string
}

const PRICES = {
  base: 75,
  print: 45,
  premium: 35
}

// Hotkey Definitionen
const HOTKEYS = {
  capture: { key: ' ', label: 'Leertaste' },
  save: { key: 's', label: 'S' },
  print: { key: 'p', label: 'P' }
}

interface SavedPhotos {
  id: string
  photos: string[]
  printedPhotos: number
  createdAt: string
  customUrl?: string
}

export default function Home() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [settings, setSettings] = useState<CameraSettings>({
    brightness: 100
  })
  const videoRef = useRef<HTMLVideoElement>(null)
  const printFrameRef = useRef<HTMLIFrameElement>(null)

  const [bookingOptions, setBookingOptions] = useState<BookingOptions>({
    printOption: false,
    premiumOption: false
  })

  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    email: '',
    phone: ''
  })

  const [showContactForm, setShowContactForm] = useState(false)
  const [showHotkeyModal, setShowHotkeyModal] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  const [savedPhotos, setSavedPhotos] = useState<SavedPhotos>({
    id: generateUniqueId(),
    photos: [],
    printedPhotos: 0,
    createdAt: new Date().toISOString()
  })

  // Load saved photos from localStorage on client side only
  useEffect(() => {
    const saved = localStorage.getItem('savedPhotos')
    if (saved) {
      setSavedPhotos(JSON.parse(saved))
    } else {
      const newCollection = {
        id: generateUniqueId(),
        photos: [],
        printedPhotos: 0,
        createdAt: new Date().toISOString()
      }
      localStorage.setItem('savedPhotos', JSON.stringify(newCollection))
    }
  }, [])

  // Generiere eine eindeutige ID für die Fotosammlung
  function generateUniqueId() {
    return `photos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // URL für die Fotosammlung
  const getCollectionUrl = () => {
    return savedPhotos.customUrl || `https://ihre-domain.de/photos/${savedPhotos.id}`
  }

  // Handler für das Aktualisieren der URL
  const handleUpdateUrl = () => {
    const updatedPhotos = {
      ...savedPhotos,
      customUrl: customUrl
    }
    setSavedPhotos(updatedPhotos)
    localStorage.setItem('savedPhotos', JSON.stringify(updatedPhotos))
    setShowUrlInput(false)
  }

  useEffect(() => {
    // Get available camera devices
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        setDevices(videoDevices)
        if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId || 'default_camera')
        }
      } catch (error) {
        console.error('Error getting devices:', error)
      }
    }

    getDevices()
  }, [])

  useEffect(() => {
    if (!selectedDevice) return

    // Start camera stream with highest available resolution
    async function startStream() {
      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
        }

        // Get all supported constraints for the selected device
        const deviceConstraints = await navigator.mediaDevices.getSupportedConstraints()
        
        // Request the stream with maximum resolution
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedDevice === 'default_camera' ? undefined : selectedDevice,
            width: { ideal: 3840 }, // 4K width
            height: { ideal: 2160 }, // 4K height
            aspectRatio: { ideal: ASPECT_RATIO } // 4:6 aspect ratio
          }
        })

        // Get the actual constraints being used
        const videoTrack = newStream.getVideoTracks()[0]
        const settings = videoTrack.getSettings()
        console.log('Actual camera settings:', settings)

        setStream(newStream)
        if (videoRef.current) {
          videoRef.current.srcObject = newStream
        }
      } catch (error) {
        console.error('Error accessing camera:', error)
      }
    }

    startStream()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [selectedDevice])

  // Automatically restart camera after photo capture is cleared
  useEffect(() => {
    if (!capturedImage && selectedDevice) {
      const startStream = async () => {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: selectedDevice === 'default_camera' ? undefined : selectedDevice,
              width: { ideal: 3840 },
              height: { ideal: 2160 },
              aspectRatio: { ideal: ASPECT_RATIO }
            }
          })
          setStream(newStream)
          if (videoRef.current) {
            videoRef.current.srcObject = newStream
          }
        } catch (error) {
          console.error('Error restarting camera:', error)
        }
      }
      startStream()
    }
  }, [capturedImage, selectedDevice])

  const handleDeviceChange = (value: string) => {
    setSelectedDevice(value)
  }

  const handleBrightnessChange = (value: number[]) => {
    setSettings(prev => ({
      ...prev,
      brightness: value[0]
    }))
  }

  const startCountdown = () => {
    setCountdown(5)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          if (prev === 1) {
            handleCapturePhoto()
          }
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleCapturePhoto = () => {
    if (!videoRef.current) return

    // Create a canvas with 4:6 aspect ratio
    const canvas = document.createElement('canvas')
    const videoAspect = videoRef.current.videoWidth / videoRef.current.videoHeight
    
    // Calculate dimensions to maintain 4:6 aspect ratio
    let drawWidth = videoRef.current.videoWidth
    let drawHeight = videoRef.current.videoHeight
    let startX = 0
    let startY = 0

    if (videoAspect > ASPECT_RATIO) {
      // Video is wider than needed
      drawWidth = drawHeight * ASPECT_RATIO
      startX = (videoRef.current.videoWidth - drawWidth) / 2
    } else {
      // Video is taller than needed
      drawHeight = drawWidth / ASPECT_RATIO
      startY = (videoRef.current.videoHeight - drawHeight) / 2
    }

    // Set canvas size to match print dimensions (scaled up for quality)
    canvas.width = 1800 // 6 inches at 300dpi
    canvas.height = 1200 // 4 inches at 300dpi

    const ctx = canvas.getContext('2d')
    if (ctx && videoRef.current) {
      ctx.filter = `brightness(${settings.brightness}%)`
      // Draw the cropped and scaled image
      ctx.drawImage(
        videoRef.current,
        startX, startY, drawWidth, drawHeight,
        0, 0, canvas.width, canvas.height
      )
      const imageData = canvas.toDataURL('image/jpeg', 0.95)
      setCapturedImage(imageData)
    }
  }

  const handleCapture = () => {
    if (capturedImage) {
      setCapturedImage(null)
      return
    }
    startCountdown()
  }

  const handlePrint = () => {
    if (!capturedImage) return
    
    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fotobox Druck</title>
          <style>
            @page {
              size: 152.4mm 101.6mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              width: 152.4mm;
              height: 101.6mm;
              display: flex;
              justify-content: center;
              align-items: center;
              overflow: hidden;
            }
            img {
              width: 152.4mm;
              height: 101.6mm;
              object-fit: cover;
              object-position: center;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <img src="${capturedImage}" alt="Foto" />
        </body>
      </html>
    `

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    // Write content to iframe and print
    const iframeDoc = iframe.contentDocument
    if (iframeDoc) {
      iframeDoc.write(printContent)
      iframeDoc.close()

      // Wait for image to load before printing
      const img = iframeDoc.querySelector('img')
      if (img) {
        img.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.print()
            // Iframe nach dem Drucken entfernen
            setTimeout(() => {
              document.body.removeChild(iframe)
            }, 100)
          }, 500)
        }
      }
    }

    // Aktualisiere den Zähler für gedruckte Fotos
    const updatedPhotos = {
      ...savedPhotos,
      printedPhotos: (savedPhotos.printedPhotos || 0) + 1
    }
    setSavedPhotos(updatedPhotos)
    localStorage.setItem('savedPhotos', JSON.stringify(updatedPhotos))
  }

  const handleSave = () => {
    if (!capturedImage) return
    
    // Speichere das Foto lokal
    const link = document.createElement('a')
    link.href = capturedImage
    link.download = `foto-${new Date().toISOString()}.jpg`
    link.click()

    // Füge das Foto zur Sammlung hinzu
    const updatedPhotos = {
      ...savedPhotos,
      photos: [...savedPhotos.photos, capturedImage]
    }
    setSavedPhotos(updatedPhotos)
    localStorage.setItem('savedPhotos', JSON.stringify(updatedPhotos))
  }

  const calculateTotalPrice = () => {
    let total = PRICES.base
    if (bookingOptions.printOption) total += PRICES.print
    if (bookingOptions.premiumOption) total += PRICES.premium
    return total
  }

  const handleOptionChange = (option: keyof BookingOptions) => {
    setBookingOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }))
  }

  const handleContactInfoChange = (field: keyof ContactInfo, value: string) => {
    setContactInfo(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmitOrder = () => {
    // Hier würde die Bestellverarbeitung implementiert werden
    console.log('Bestellung aufgegeben:', {
      options: bookingOptions,
      contact: contactInfo,
      totalPrice: calculateTotalPrice()
    })
  }

  // Hotkey Handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Keine Hotkeys wenn ein Input-Feld fokussiert ist
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.key.toLowerCase()) {
        case HOTKEYS.capture.key:
          handleCapture()
          break
        case HOTKEYS.save.key:
          if (capturedImage) {
            handleSave()
          }
          break
        case HOTKEYS.print.key:
          if (capturedImage) {
            handlePrint()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [capturedImage]) // Abhängigkeit von capturedImage für korrekte Button-Funktionalität

  // State für URL-Input Dialog
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [customUrl, setCustomUrl] = useState('')

  // Funktion zum Zurücksetzen der Sammlung
  const handleResetCollection = () => {
    const newCollection = {
      id: generateUniqueId(),
      photos: [],
      printedPhotos: 0,
      createdAt: new Date().toISOString()
    }
    setSavedPhotos(newCollection)
    localStorage.setItem('savedPhotos', JSON.stringify(newCollection))
    setCustomUrl('')
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Fotobox</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Hauptbereich mit Kamera und Steuerung */}
        <div className="lg:col-span-3">
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Kamera</label>
                  <Select 
                    value={selectedDevice} 
                    onValueChange={handleDeviceChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kamera auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default_camera">Standard Kamera</SelectItem>
                      {devices.map((device) => (
                        <SelectItem 
                          key={device.deviceId} 
                          value={device.deviceId || `camera_${device.deviceId.slice(0, 5)}`}
                        >
                          {device.label || `Kamera ${device.deviceId.slice(0, 5)}...`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Helligkeit: {settings.brightness}%
                  </label>
                  <Slider
                    value={[settings.brightness]}
                    onValueChange={handleBrightnessChange}
                    min={50}
                    max={150}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              <div 
                className="relative bg-black rounded-lg overflow-hidden mb-4"
                style={{ aspectRatio: `${PRINT_SIZES.width / PRINT_SIZES.height}` }}
              >
                {countdown !== null && (
                  <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center">
                    <div 
                      className="text-8xl font-bold text-white animate-[countdown_1s_ease-in-out]"
                      style={{
                        animation: 'countdown 1s ease-in-out infinite',
                      }}
                    >
                      {countdown}
                    </div>
                  </div>
                )}
                {capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="Aufgenommenes Foto"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: `brightness(${settings.brightness}%)` }}
                  />
                )}
              </div>

              <div className="flex justify-center gap-4">
                {!capturedImage ? (
                  <Button onClick={handleCapture} className="flex items-center gap-2">
                    Foto aufnehmen
                    <span className="text-xs opacity-70">[{HOTKEYS.capture.label}]</span>
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleSave} className="flex items-center gap-2">
                      Foto speichern
                      <span className="text-xs opacity-70">[{HOTKEYS.save.label}]</span>
                    </Button>
                    <Button onClick={handlePrint} className="flex items-center gap-2">
                      Foto drucken (10x15cm)
                      <span className="text-xs opacity-70">[{HOTKEYS.print.label}]</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setCapturedImage(null)}
                      className="flex items-center gap-2"
                    >
                      Neues Foto
                      <span className="text-xs opacity-70">[{HOTKEYS.capture.label}]</span>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fixierte Seitenleiste rechts */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* QR-Code Sektion */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Fotosammlung</h3>
                  <div className="bg-white p-4 rounded-lg shadow-inner">
                    <QRCodeSVG
                      value={getCollectionUrl()}
                      size={200}
                      level="H"
                      className="mx-auto"
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Scanne den QR-Code, um die Bilder dir anzusehen und herunterzuladen
                  </p>
                  <div className="text-xs text-center text-muted-foreground space-y-1">
                    <p>Sammlung erstellt am: {new Date(savedPhotos.createdAt).toLocaleDateString()}</p>
                    <p>Gespeicherte Fotos: {savedPhotos.photos.length}</p>
                    <p>Gedruckte Fotos: {savedPhotos.printedPhotos || 0}</p>
                  </div>

                </div>

                {/* Hotkeys Sektion */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Tastenkombinationen</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">Leertaste</div>
                    <div>Foto aufnehmen</div>
                    <div className="font-medium">S</div>
                    <div>Foto speichern</div>
                    <div className="font-medium">P</div>
                    <div>Foto drucken</div>
                  </div>
                </div>

                {/* Aktions-Buttons */}
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => window.open(getCollectionUrl(), '_blank')}
                  >
                    Fotos anzeigen
                  </Button>
                  <Dialog open={showUrlInput} onOpenChange={setShowUrlInput}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline"
                        className="w-full"
                      >
                        Link/QR-Code generieren
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Link für Fotosammlung</DialogTitle>
                        <DialogDescription>
                          Geben Sie den Link zu Ihrer Fotosammlung ein, um den QR-Code zu generieren
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label>Link zur Fotosammlung</Label>
                          <input
                            type="url"
                            className="w-full p-2 border rounded"
                            placeholder="https://ihre-fotos.de/sammlung"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                          />
                        </div>
                        <Button onClick={handleUpdateUrl}>
                          QR-Code aktualisieren
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bestell-Button */}
      <div className="fixed bottom-8 right-8">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              Jetzt Bestellen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Ihr individuelles Fotobox-Paket</DialogTitle>
              <DialogDescription>
                Wählen Sie Ihre gewünschten Optionen und konfigurieren Sie Ihr persönliches Paket.
              </DialogDescription>
            </DialogHeader>

            {!showContactForm ? (
              <div className="grid gap-6 py-4">
                {/* Basis-Paket */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-lg mb-2">Basis-Paket</h3>
                  <p className="text-2xl font-bold mb-2">€{PRICES.base}</p>
                  <ul className="text-sm space-y-1 mb-2">
                    <li>• Alle digitalen Kopien der Fotos</li>
                    <li>• Unbegrenzte Downloads</li>
                    <li>• Sofortige Verfügbarkeit</li>
                    <li>• Accessoires</li>
                  </ul>
                  <p className="text-sm text-blue-600">✓ Immer inklusive</p>
                </div>

                {/* Druck-Option */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Druck-Upgrade</Label>
                      <p className="text-sm text-muted-foreground">
                        100 Fotos + Requisiten (+ €{PRICES.print})
                      </p>
                    </div>
                    <Switch
                      checked={bookingOptions.printOption}
                      onCheckedChange={() => handleOptionChange('printOption')}
                    />
                  </div>
                  {bookingOptions.printOption && (
                    <div className="ml-6 text-sm space-y-1 text-muted-foreground">
                    </div>
                  )}
                </div>

                {/* Premium-Option */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Premium-Upgrade</Label>
                      <p className="text-sm text-muted-foreground">
                        Erweiterte Accessoires + Fotobuch (+ €{PRICES.premium})
                      </p>
                    </div>
                    <Switch
                      checked={bookingOptions.premiumOption}
                      onCheckedChange={() => handleOptionChange('premiumOption')}
                    />
                  </div>
                  {bookingOptions.premiumOption && (
                    <div className="ml-6 text-sm space-y-1 text-muted-foreground">
                      <p>• Hochwertige Requisiten</p>
                      <p>• Premium Accessoires</p>
                      <p>• Exklusive Designs</p>
                      <p>• Digitaler Download in hoher Auflösung</p>
                      <p>• Hochwertiges Fotobuch (20 Seiten)</p>
                    </div>
                  )}
                </div>

                {/* Gesamtpreis */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Gesamtpreis:</span>
                    <span className="text-2xl font-bold">€{calculateTotalPrice()}</span>
                  </div>
                </div>

                <Button 
                  className="w-full"
                  onClick={() => setShowContactForm(true)}
                >
                  Weiter zur Bestellung
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      placeholder="Ihr vollständiger Name"
                      value={contactInfo.name}
                      onChange={(e) => handleContactInfoChange('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <input
                      type="email"
                      className="w-full p-2 border rounded"
                      placeholder="ihre.email@beispiel.de"
                      value={contactInfo.email}
                      onChange={(e) => handleContactInfoChange('email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <input
                      type="tel"
                      className="w-full p-2 border rounded"
                      placeholder="Ihre Telefonnummer"
                      value={contactInfo.phone}
                      onChange={(e) => handleContactInfoChange('phone', e.target.value)}
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg mt-4">
                    <h4 className="font-semibold mb-2">Ihre Auswahl:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Basis-Paket: €{PRICES.base}</li>
                      {bookingOptions.printOption && (
                        <li>• Druck-Upgrade: €{PRICES.print}</li>
                      )}
                      {bookingOptions.premiumOption && (
                        <li>• Premium-Upgrade: €{PRICES.premium}</li>
                      )}
                      <li className="font-semibold mt-2">
                        Gesamtpreis: €{calculateTotalPrice()}
                      </li>
                    </ul>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowContactForm(false)}
                    >
                      Zurück
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleSubmitOrder}
                    >
                      Bestellung abschließen
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 