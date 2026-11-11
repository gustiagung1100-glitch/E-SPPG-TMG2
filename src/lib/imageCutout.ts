/**
 * Utility for Automatic Background Removal of Ompreng (Food Tray) Photos
 * Isolates the stainless steel ompreng tray and food items from the table/kitchen background.
 */

export interface CutoutOptions {
  tolerance?: number; // Color difference threshold (20 - 60, default 36)
  feather?: number; // Edge feathering width (10 - 30, default 16)
  trayShape?: 'auto' | 'squircle' | 'ellipse';
}

/**
 * Removes background from an image URL and returns a transparent PNG DataURL.
 * Keeps only the ompreng tray and its nutritious food contents.
 */
export async function removeOmprengBackground(
  imageUrl: string,
  options?: CutoutOptions
): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        // Limit processing dimension for optimal speed and crisp quality
        const maxDimension = 900;
        let w = img.width;
        let h = img.height;
        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          } else {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Sample background color clusters from the outer perimeter
        const samples: [number, number][] = [];
        const insetX = Math.max(3, Math.floor(w * 0.02));
        const insetY = Math.max(3, Math.floor(h * 0.02));

        // Corners
        samples.push([insetX, insetY]);
        samples.push([w - 1 - insetX, insetY]);
        samples.push([insetX, h - 1 - insetY]);
        samples.push([w - 1 - insetX, h - 1 - insetY]);

        // Perimeter midpoints
        for (let i = 1; i <= 3; i++) {
          const fx = Math.floor((w * i) / 4);
          const fy = Math.floor((h * i) / 4);
          samples.push([fx, insetY]);
          samples.push([fx, h - 1 - insetY]);
          samples.push([insetX, fy]);
          samples.push([w - 1 - insetX, fy]);
        }

        let sumR = 0, sumG = 0, sumB = 0;
        samples.forEach(([sx, sy]) => {
          const idx = (sy * w + sx) * 4;
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
        });
        const bgR = sumR / samples.length;
        const bgG = sumG / samples.length;
        const bgB = sumB / samples.length;

        const tolerance = options?.tolerance || 38;
        const feather = options?.feather || 18;

        const cx = w / 2;
        const cy = h / 2;
        const rx = w * 0.44;
        const ry = h * 0.42;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Color distance to sampled background
            const dR = r - bgR;
            const dG = g - bgG;
            const dB = b - bgB;
            const dist = Math.sqrt(dR * dR + dG * dG + dB * dB);

            // Super-ellipse squircle distance: (x/rx)^4 + (y/ry)^4
            // Accurately conforms to standard rectangular-curved stainless steel ompreng
            const dx = Math.abs(x - cx) / rx;
            const dy = Math.abs(y - cy) / ry;
            const squircleDist = Math.pow(dx, 4) + Math.pow(dy, 4);

            let alpha = 255;

            if (squircleDist > 1.3) {
              // Outside ompreng tray bounds
              alpha = 0;
            } else if (squircleDist > 0.95) {
              // Perimeter transition zone
              const outerRatio = (squircleDist - 0.95) / 0.35;
              if (dist < tolerance + feather) {
                const colorRatio = Math.max(0, (dist - tolerance) / feather);
                alpha = Math.round(255 * (1 - outerRatio) * colorRatio);
              } else {
                alpha = Math.round(255 * (1 - outerRatio));
              }
            } else {
              // Inside the tray: preserve food and stainless steel
              if (squircleDist > 0.65 && dist < tolerance) {
                alpha = 0;
              } else if (squircleDist > 0.65 && dist < tolerance + feather) {
                const fade = (dist - tolerance) / feather;
                alpha = Math.round(255 * fade);
              }
            }

            data[idx + 3] = alpha;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Canvas cutout fallback due to CORS/security on remote image:', err);
        resolve(imageUrl);
      }
    };

    img.onerror = () => {
      resolve(imageUrl);
    };

    img.src = imageUrl;
  });
}
