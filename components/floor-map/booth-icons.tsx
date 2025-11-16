import React from "react"
import { cn } from "@/lib/utils"

type BoothIconProps = {
  className?: string
  strokeWidth?: number
}

// L-booth icon: L shape (top horizontal, left vertical)
// Based on canvas: top edge full width, left edge full height, with L cutout at bottom-right
// Path: top-left -> top-right -> down a bit -> left -> down (full) -> left to close
export function LBoothIcon({ className, strokeWidth = 1.5 }: BoothIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-muted-foreground", className)}
    >
      <path
        d="M 1 1 L 15 1 L 15 6.4 L 6.4 6.4 L 6.4 15 L 1 15 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

// U-booth icon: U shape (top, left, right sides with bottom cutout in the middle)
// Based on canvas: top full width, left and right sides full height, bottom has cutout
// Path: top-left -> top-right -> down (full) -> left (cutout) -> up -> right (cutout) -> up -> left to close
export function UBoothIcon({ className, strokeWidth = 1.5 }: BoothIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-muted-foreground", className)}
    >
      <path
        d="M 1 1 L 15 1 L 15 15 L 11.8 15 L 11.8 4.8 L 4.2 4.8 L 4.2 15 L 1 15 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Corner-booth icon: Corner shape (top-right corner cutout)
// Based on canvas: full rectangle with corner cutout at top-right
// Path: top-left -> almost right -> down -> right -> down (full) -> left to close
export function CornerBoothIcon({ className, strokeWidth = 1.5 }: BoothIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-muted-foreground", className)}
    >
      <path
        d="M 1 1 L 8.4 1 L 8.4 6.4 L 15 6.4 L 15 15 L 1 15 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Rectangular table icon: Rounded rectangle
// Based on canvas: rectangular table with rounded corners
export function RectangularTableIcon({ className, strokeWidth = 1.5 }: BoothIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-muted-foreground", className)}
    >
      <rect
        x="2"
        y="3"
        width="12"
        height="10"
        rx="2"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
    </svg>
  )
}

// Bar table icon: Horizontal bar (wider and shorter)
// Based on canvas: bar table is a rounded rectangle, typically wider than tall
export function BarTableIcon({ className, strokeWidth = 1.5 }: BoothIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-muted-foreground", className)}
    >
      <rect
        x="1"
        y="6"
        width="14"
        height="4"
        rx="1.5"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
    </svg>
  )
}

