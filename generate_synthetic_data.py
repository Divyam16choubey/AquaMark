import numpy as np
import cv2
import os

output_dir = "test_images"
os.makedirs(output_dir, exist_ok=True)

def save_img(filename, img):
    filepath = os.path.join(output_dir, filename)
    cv2.imwrite(filepath, img)
    print(f"Created: {filepath}")

# 1. Random uniform noise
# The model might have been trained on random noise before photographic textures
noise = np.random.randint(0, 256, (256, 256, 3), dtype=np.uint8)
save_img("synthetic_noise.png", noise)

# 2. Smooth Gradient
# A gradient tests how well the invisible watermark hides in smooth transitions
gradient = np.zeros((256, 256, 3), dtype=np.uint8)
for i in range(256):
    for j in range(256):
        gradient[i, j, 0] = i  # B
        gradient[i, j, 1] = j  # G
        gradient[i, j, 2] = (i + j) // 2  # R
save_img("synthetic_gradient.png", gradient)

# 3. Geometric Shapes
# Tests edge preservation around hard geometric boundaries
shapes = np.full((256, 256, 3), 200, dtype=np.uint8) # Light gray background
cv2.rectangle(shapes, (40, 40), (216, 216), (255, 50, 50), -1) # Blue square
cv2.circle(shapes, (128, 128), 60, (50, 255, 50), -1) # Green circle
save_img("synthetic_shapes.png", shapes)

print(f"\nSuccessfully generated 3 synthetic images in the '{output_dir}' directory.")
