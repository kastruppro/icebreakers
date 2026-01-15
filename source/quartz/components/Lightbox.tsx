import lightboxScript from "./scripts/lightbox.inline"
import styles from "./styles/lightbox.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Lightbox: QuartzComponent = ({ displayClass, cfg }: QuartzComponentProps) => {
  // This component doesn't render anything visible
  // It just provides the lightbox overlay container
  return (
    <div id="lightbox-overlay" class="lightbox-overlay">
      <button class="lightbox-close" aria-label="Close lightbox">&times;</button>
      <img class="lightbox-image" src="" alt="" />
    </div>
  )
}

Lightbox.afterDOMLoaded = lightboxScript
Lightbox.css = styles

export default (() => Lightbox) satisfies QuartzComponentConstructor
