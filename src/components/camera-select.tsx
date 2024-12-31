import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CameraSelectProps {
  devices: MediaDeviceInfo[]
  selectedDevice: string
  onDeviceChange: (deviceId: string) => void
}

export default function CameraSelect({
  devices,
  selectedDevice,
  onDeviceChange,
}: CameraSelectProps) {
  return (
    <div className="w-full max-w-xs">
      <Select value={selectedDevice} onValueChange={onDeviceChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a camera" />
        </SelectTrigger>
        <SelectContent>
          {devices.map((device) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 