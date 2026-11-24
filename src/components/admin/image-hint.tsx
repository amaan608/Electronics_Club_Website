export function ImageHint() {
  return (
    <p className="form-hint">
      Upload the photo in Cloudinary, open it, and copy its delivery URL. It starts with https://res.cloudinary.com/ and
      contains /image/upload/. The site crops and resizes it automatically. Leave it empty to show initials.
    </p>
  );
}
