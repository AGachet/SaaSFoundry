import { useEffect, useMemo, useState } from 'react'

interface PageLoaderProps {
  className?: string
  background?: string
  primaryColor?: string
  duration?: number
}

export const PageLoader = ({ className = 'scatterboxloader', background = '#FFFFFF', primaryColor = '#FF6B00', duration = 1 }: PageLoaderProps) => {
  const [mounted, setMounted] = useState(false)

  // Function to darken a color
  const darkenColor = (color: string, amount = 0.15): string => {
    // Convert hex color to RGB
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Darken
    const darkenR = Math.floor(r * (1 - amount))
    const darkenG = Math.floor(g * (1 - amount))
    const darkenB = Math.floor(b * (1 - amount))

    // Convert to hex
    return `#${darkenR.toString(16).padStart(2, '0')}${darkenG.toString(16).padStart(2, '0')}${darkenB.toString(16).padStart(2, '0')}`
  }

  // Function to lighten a color
  const lightenColor = (color: string, amount = 0.15): string => {
    // Convert hex color to RGB
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Lighten
    const lightenR = Math.min(255, Math.floor(r + (255 - r) * amount))
    const lightenG = Math.min(255, Math.floor(g + (255 - g) * amount))
    const lightenB = Math.min(255, Math.floor(b + (255 - b) * amount))

    // Convert to hex
    return `#${lightenR.toString(16).padStart(2, '0')}${lightenG.toString(16).padStart(2, '0')}${lightenB.toString(16).padStart(2, '0')}`
  }

  const primary = darkenColor(primaryColor)
  const primaryRGBA = lightenColor(primaryColor)

  // Use useMemo to avoid unnecessary recalculations
  const boxMoveParams = useMemo(
    () => [
      [12, 25],
      [16, 29],
      [20, 33],
      [24, 37],
      [28, 41],
      [32, 45],
      [36, 49],
      [40, 53]
    ],
    []
  )

  const boxScaleParams = useMemo(
    () => [
      [6, 14],
      [10, 18],
      [14, 22],
      [18, 26],
      [22, 30],
      [26, 34],
      [30, 38],
      [34, 42]
    ],
    []
  )

  // Dynamically generate keyframes
  useEffect(() => {
    setMounted(true)

    // Add dynamic keyframes to the head
    const style = document.createElement('style')
    style.innerHTML =
      boxMoveParams
        .map(
          (params, i) => `
      @keyframes boxMove${i} {
        ${params[0]}% { transform: translate(var(--x), var(--y)); }
        ${params[1]}%, 52% { transform: translate(0, 0); }
        80% { transform: translate(0, -32px); }
        90%, 100% { transform: translate(0, 188px); }
      }
    `
        )
        .join('\n') +
      boxScaleParams
        .map(
          (params, i) => `
      @keyframes boxScale${i} {
        ${params[0]}% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); }
        ${params[1]}%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); }
      }
    `
        )
        .join('\n') +
      `
      @keyframes animGround {
        0%, 65% { transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px) scale(0); }
        75%, 90% { transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px) scale(1); }
        100% { transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px) scale(0); }
      }
      @keyframes animGroundShine {
        0%, 70% { opacity: 0; }
        75%, 87% { opacity: 0.2; }
        100% { opacity: 0; }
      }
      @keyframes animMask {
        0%, 65% { opacity: 0; }
        66%, 100% { opacity: 1; }
      }
    `

    // Add specific styles for Container and Boxes
    style.innerHTML += `
      .scatter-box-container {
        --background: ${background};
        --duration: ${duration}s;
        --primary: ${primaryColor};
        --primary-light: ${primary};
        --primary-rgba: ${primaryRGBA}00;
        width: 200px;
        height: 320px;
        position: relative;
        transform-style: preserve-3d;
      }
      @media (max-width: 480px) {
        .scatter-box-container {
          zoom: 0.44;
        }
      }
      .scatter-box-container:before,
      .scatter-box-container:after {
        --r: 20.5deg;
        content: "";
        width: 320px;
        height: 140px;
        position: absolute;
        right: 32%;
        bottom: -11px;
        background: var(--background);
        transform: translateZ(200px) rotate(var(--r));
        animation: animMask var(--duration) linear forwards infinite;
      }
      .scatter-box-container:after {
        --r: -20.5deg;
        right: auto;
        left: 32%;
      }

      .ground-div {
        transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px) scale(0);
        width: 200px;
        height: 200px;
        background: var(--primary);
        background: linear-gradient(45deg, var(--primary) 0%, var(--primary) 50%, var(--primary-light) 50%, var(--primary-light) 100%);
        transform-style: preserve-3d;
        animation: animGround var(--duration) linear forwards infinite;
      }
      .ground-div:before,
      .ground-div:after {
        --rx: 90deg;
        --ry: 0deg;
        --x: 44px;
        --y: 162px;
        --z: -50px;
        content: "";
        width: 156px;
        height: 300px;
        opacity: 0;
        background: linear-gradient(var(--primary), var(--primary-rgba));
        position: absolute;
        transform: rotateX(var(--rx)) rotateY(var(--ry)) translate(var(--x), var(--y)) translateZ(var(--z));
        animation: animGroundShine var(--duration) linear forwards infinite;
      }
      .ground-div:after {
        --rx: 90deg;
        --ry: 90deg;
        --x: 0;
        --y: 177px;
        --z: 150px;
      }

      .ground {
        position: absolute;
        left: -50px;
        bottom: -120px;
        transform-style: preserve-3d;
        transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1);
      }

      .box {
        --x: 0px;
        --y: 0px;
        position: absolute;
        animation: var(--duration) linear forwards infinite;
        transform: translate(var(--x), var(--y));
      }
      .box > div {
        background-color: var(--primary);
        width: 48px;
        height: 48px;
        position: relative;
        transform-style: preserve-3d;
        animation: var(--duration) ease forwards infinite;
        transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0);
      }
      .box > div:before,
      .box > div:after {
        --rx: 90deg;
        --ry: 0deg;
        --z: 24px;
        --y: -24px;
        --x: 0;
        --b: 1.2;
        content: "";
        position: absolute;
        background-color: inherit;
        width: inherit;
        height: inherit;
        transform: rotateX(var(--rx)) rotateY(var(--ry)) translate(var(--x), var(--y)) translateZ(var(--z));
        filter: brightness(var(--b));
      }
      .box > div:after {
        --rx: 0deg;
        --ry: 90deg;
        --x: 24px;
        --y: 0;
        --b: 1.4;
      }

      .box0 {
        --x: -220px;
        --y: -120px;
        left: 58px;
        top: 108px;
      }
      .box1 {
        --x: -260px;
        --y: 120px;
        left: 25px;
        top: 120px;
      }
      .box2 {
        --x: 120px;
        --y: -190px;
        left: 58px;
        top: 64px;
      }
      .box3 {
        --x: 280px;
        --y: -40px;
        left: 91px;
        top: 120px;
      }
      .box4 {
        --x: 60px;
        --y: 200px;
        left: 58px;
        top: 132px;
      }
      .box5 {
        --x: -220px;
        --y: -120px;
        left: 25px;
        top: 76px;
      }
      .box6 {
        --x: -260px;
        --y: 120px;
        left: 91px;
        top: 76px;
      }
      .box7 {
        --x: -240px;
        --y: 200px;
        left: 58px;
        top: 87px;
      }
    `

    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [background, duration, primary, primaryColor, primaryRGBA, boxMoveParams, boxScaleParams])

  if (!mounted) return null

  // Define animation styles for each box
  const getBoxStyles = (moveIndex: number, scaleIndex: number) => {
    return {
      animation: `boxMove${moveIndex} var(--duration) linear forwards infinite`,
      div: {
        animation: `boxScale${scaleIndex} var(--duration) ease forwards infinite`
      }
    }
  }

  // Box configurations
  const boxesConfig = [
    { className: 'box0', moveIndex: 0, scaleIndex: 0 },
    { className: 'box1', moveIndex: 1, scaleIndex: 1 },
    { className: 'box2', moveIndex: 2, scaleIndex: 2 },
    { className: 'box3', moveIndex: 3, scaleIndex: 3 },
    { className: 'box4', moveIndex: 4, scaleIndex: 4 },
    { className: 'box5', moveIndex: 5, scaleIndex: 5 },
    { className: 'box6', moveIndex: 6, scaleIndex: 6 },
    { className: 'box7', moveIndex: 0, scaleIndex: 0 }
  ]

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className={`scatter-box-container ${className}`}>
        {/* All boxes */}
        {boxesConfig.map((config, index) => {
          const boxStyles = getBoxStyles(config.moveIndex, config.scaleIndex)
          return (
            <div key={index} className={`box ${config.className}`} style={{ animation: boxStyles.animation }}>
              <div style={{ animation: boxStyles.div.animation }}></div>
            </div>
          )
        })}

        {/* Ground */}
        <div className="ground">
          <div className="ground-div"></div>
        </div>
      </div>

      {/* Loading text */}
      <div className="absolute mt-[340px] animate-pulse text-center font-medium text-muted-foreground">Loading...</div>
    </div>
  )
}

export default PageLoader
