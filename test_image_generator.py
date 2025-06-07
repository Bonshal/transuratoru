#!/usr/bin/env python3
"""
Simple script to create a test image with Japanese text for testing manga-ocr.
This creates a basic image that simulates manga text.
"""

from PIL import Image, ImageDraw, ImageFont
import sys

def create_test_image():
    # Create a white background image
    width, height = 400, 200
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)
    
    # Japanese text samples
    japanese_texts = [
        "こんにちは！",  # Hello!
        "今日は良い天気ですね。",  # It's nice weather today.
        "漫画を読んでいます。"  # I'm reading manga.
    ]
    
    try:
        # Try to use a Japanese font if available (on macOS)
        font_paths = [
            "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",  # Hiragino Sans
            "/System/Library/Fonts/Arial Unicode MS.ttf",
            "/Library/Fonts/Arial Unicode MS.ttf"
        ]
        
        font = None
        for font_path in font_paths:
            try:
                font = ImageFont.truetype(font_path, 24)
                print(f"Using font: {font_path}")
                break
            except:
                continue
        
        if font is None:
            # Fallback to default font
            font = ImageFont.load_default()
            print("Using default font (may not display Japanese correctly)")
    
    except Exception as e:
        font = ImageFont.load_default()
        print(f"Font loading error: {e}, using default")
    
    # Draw the Japanese text
    y_pos = 30
    for text in japanese_texts:
        draw.text((20, y_pos), text, fill='black', font=font)
        y_pos += 40
    
    # Add a simple border
    draw.rectangle([10, 10, width-10, height-10], outline='black', width=2)
    
    # Save the image
    output_path = "/Users/bonshallangthasa/Desktop/projects/transuratoru/test_manga.png"
    image.save(output_path)
    print(f"Test image created: {output_path}")
    print("Japanese text in image:")
    for i, text in enumerate(japanese_texts, 1):
        print(f"  {i}. {text}")
    
    return output_path

if __name__ == "__main__":
    create_test_image()
