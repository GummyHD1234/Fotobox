import { forwardRef } from 'react'

interface CameraViewProps {
  className?: string
}

const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(
  ({ className = '' }, ref) => {
    return (
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${className}`}
      />
    )
  }
)

CameraView.displayName = 'CameraView'

export default CameraView 