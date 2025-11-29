# Barbershop Website - Customization Guide

## 🎨 Overview

This is a modern, classic barbershop website built with Next.js 16, React 19, and shadcn/ui components. It follows the same structure as the Bento Barbearias website with a clean white background, black text, and modern design.

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Main layout with metadata
│   ├── page.tsx            # Main page with all sections
│   └── globals.css         # Global styles
├── components/
│   ├── loading-screen.tsx  # Loading animation with logo
│   ├── navigation.tsx      # Fixed navigation bar
│   ├── hero-section.tsx    # Hero section with CTA
│   ├── about-section.tsx   # About the barbershop
│   ├── barber-section.tsx  # Barber profile (Edgar)
│   ├── services-section.tsx # Services with filters
│   ├── booking-section.tsx # Online booking placeholder
│   ├── brands-section.tsx  # Brands carousel
│   └── footer.tsx          # Footer with contact info
└── components/ui/          # shadcn/ui components
```

## 🔧 How to Customize

### 1. Replace the Logo

**Loading Screen:**
- Edit: `src/components/loading-screen.tsx`
- Replace the placeholder LOGO div with your actual logo image:

```tsx
<Image
  src="/logo.png"
  alt="Barbershop Logo"
  width={128}
  height={128}
  priority
/>
```

**Navigation:**
- Edit: `src/components/navigation.tsx`
- Replace "BARBERSHOP" text with your logo or brand name

### 2. Update Text Content

**Hero Section** (`src/components/hero-section.tsx`):
- Change the main heading
- Update the subtitle
- Modify the CTA button text

**About Section** (`src/components/about-section.tsx`):
- Update the three paragraphs with your barbershop's story
- Change the feature tags (Premium Service, Expert Barbers, etc.)

**Barber Section** (`src/components/barber-section.tsx`):
- Update Edgar's information
- Add more barbers by duplicating the Card component

**Services** (`src/components/services-section.tsx`):
- Modify the services array with your actual services and prices
- Add or remove services as needed
- Change categories if needed

**Footer** (`src/components/footer.tsx`):
- Update contact information
- Change address and phone numbers
- Update opening hours
- Add your social media links

### 3. Add Images

**Hero Background:**
- Edit: `src/components/hero-section.tsx`
- Replace the placeholder background:

```tsx
<div className="absolute inset-0 bg-[url('/your-hero-image.jpg')] bg-cover bg-center bg-no-repeat" />
```

**Barber Photo:**
- Edit: `src/components/barber-section.tsx`
- Replace the placeholder with actual image:

```tsx
<Image
  src="/edgar-photo.jpg"
  alt="Edgar - Master Barber"
  fill
  className="object-cover"
/>
```

**Brand Logos:**
- Edit: `src/components/brands-section.tsx`
- Replace the "LOGO" placeholder with actual brand logos

### 4. Integrate Booking System

**Current State:**
The booking section has a placeholder for integration.

**To Integrate:**
1. Edit: `src/components/booking-section.tsx`
2. Replace the placeholder div with your booking system iframe or widget
3. Example with iframe:

```tsx
<iframe
  src="https://your-booking-system.com/widget"
  className="w-full h-[600px] border-0"
  title="Book Appointment"
/>
```

### 5. Customize Colors

The site uses a black and white theme. To customize:

**Edit:** `src/app/globals.css`

Change the CSS variables:
```css
:root {
  --primary: oklch(0.205 0 0);  /* Black */
  --background: oklch(1 0 0);    /* White */
  /* Add your custom colors */
}
```

### 6. Adjust Loading Screen Duration

**Edit:** `src/components/loading-screen.tsx`

Change the timeout duration (currently 2000ms = 2 seconds):

```tsx
const timer = setTimeout(() => {
  setIsLoading(false);
}, 2000); // Change this value
```

### 7. Update Metadata

**Edit:** `src/app/layout.tsx`

```tsx
export const metadata: Metadata = {
  title: "Your Barbershop Name",
  description: "Your description here",
};
```

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📱 Responsive Design

The website is fully responsive and works on:
- Desktop (1920px+)
- Tablet (768px - 1919px)
- Mobile (320px - 767px)

## 🎯 Key Features

- ✅ Loading screen with logo animation
- ✅ Smooth scroll navigation
- ✅ Service filtering (All/Haircuts/Beard)
- ✅ Infinite scrolling brands carousel
- ✅ Responsive design
- ✅ Modern, clean UI with shadcn/ui components
- ✅ SEO-friendly structure
- ✅ Fast performance with Next.js 16

## 📝 Next Steps

1. **Add your logo** to the loading screen and navigation
2. **Replace placeholder images** with actual photos
3. **Update all text content** with your barbershop's information
4. **Integrate booking system** (calendar widget)
5. **Add brand logos** to the brands section
6. **Test on different devices** to ensure responsiveness
7. **Deploy** to Vercel, Netlify, or your preferred hosting

## 🆘 Need Help?

- Check the [Next.js Documentation](https://nextjs.org/docs)
- Review [shadcn/ui Components](https://ui.shadcn.com)
- Refer to [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

**Built with ❤️ using Next.js, React, and shadcn/ui**

