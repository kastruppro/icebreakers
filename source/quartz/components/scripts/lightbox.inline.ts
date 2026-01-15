// Lightbox functionality for images
// Click any image to view full-size in overlay

document.addEventListener("nav", () => {
  const overlay = document.getElementById("lightbox-overlay") as HTMLElement
  const lightboxImage = overlay?.querySelector(".lightbox-image") as HTMLImageElement
  const closeButton = overlay?.querySelector(".lightbox-close") as HTMLButtonElement

  if (!overlay || !lightboxImage || !closeButton) return

  // Open lightbox when clicking any content image
  const openLightbox = (e: Event) => {
    const img = e.currentTarget as HTMLImageElement
    if (!img.src) return

    lightboxImage.src = img.src
    lightboxImage.alt = img.alt || ""
    overlay.classList.add("active")
    document.body.style.overflow = "hidden"
  }

  // Close lightbox
  const closeLightbox = () => {
    overlay.classList.remove("active")
    document.body.style.overflow = ""
    lightboxImage.src = ""
  }

  // Close on overlay click (but not on image click)
  const overlayClick = (e: Event) => {
    if (e.target === overlay || e.target === closeButton) {
      closeLightbox()
    }
  }

  // Close on Escape key
  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) {
      closeLightbox()
    }
  }

  // Attach click handlers to all content images
  const contentImages = document.querySelectorAll("article img") as NodeListOf<HTMLImageElement>
  contentImages.forEach((img) => {
    img.style.cursor = "zoom-in"
    img.addEventListener("click", openLightbox)
  })

  overlay.addEventListener("click", overlayClick)
  closeButton.addEventListener("click", closeLightbox)
  document.addEventListener("keydown", escapeHandler)

  // Cleanup
  window.addCleanup(() => {
    contentImages.forEach((img) => {
      img.removeEventListener("click", openLightbox)
    })
    overlay.removeEventListener("click", overlayClick)
    closeButton.removeEventListener("click", closeLightbox)
    document.removeEventListener("keydown", escapeHandler)
  })
})
