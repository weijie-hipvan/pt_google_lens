'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text, Group } from 'react-konva';
import { useTaggingStore } from '@/store/taggingStore';

const CONFIDENCE_COLORS = {
  high: '#22c55e',
  medium: '#eab308',
  low: '#ef4444',
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.85) return CONFIDENCE_COLORS.high;
  if (confidence >= 0.6) return CONFIDENCE_COLORS.medium;
  return CONFIDENCE_COLORS.low;
};

export default function CanvasViewer() {
  const { imageUrl, imageDimensions, objects, selectedObjectId, selectObject } =
    useTaggingStore();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // Load image
  useEffect(() => {
    if (imageUrl) {
      const img = new window.Image();
      img.src = imageUrl;
      img.onload = () => setImage(img);
    } else {
      setImage(null);
    }
  }, [imageUrl]);

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calculate scale to fit image in container
  const scale = imageDimensions
    ? Math.min(
        stageSize.width / imageDimensions.naturalWidth,
        stageSize.height / imageDimensions.naturalHeight
      )
    : 1;

  const scaledWidth = imageDimensions
    ? imageDimensions.naturalWidth * scale
    : 0;
  const scaledHeight = imageDimensions
    ? imageDimensions.naturalHeight * scale
    : 0;
  const offsetX = (stageSize.width - scaledWidth) / 2;
  const offsetY = (stageSize.height - scaledHeight) / 2;

  const handleBoxClick = useCallback(
    (objectId: string) => {
      selectObject(objectId);
    },
    [selectObject]
  );

  const handleStageClick = useCallback(
    (e: { target: { getStage: () => unknown } }) => {
      // Deselect if clicking on stage background
      if (e.target === e.target.getStage()) {
        selectObject(null);
      }
    },
    [selectObject]
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gray-900 rounded-lg overflow-hidden"
    >
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onClick={handleStageClick}
      >
        <Layer>
          {image && imageDimensions && (
            <KonvaImage
              image={image}
              x={offsetX}
              y={offsetY}
              width={scaledWidth}
              height={scaledHeight}
            />
          )}

          {imageDimensions &&
            objects.map((obj) => {
              const color = getConfidenceColor(obj.confidence);
              const isSelected = obj.id === selectedObjectId;
              const isRejected = obj.status === 'rejected';

              const x =
                offsetX +
                obj.bounding_box.x * imageDimensions.naturalWidth * scale;
              const y =
                offsetY +
                obj.bounding_box.y * imageDimensions.naturalHeight * scale;
              const width =
                obj.bounding_box.width * imageDimensions.naturalWidth * scale;
              const height =
                obj.bounding_box.height * imageDimensions.naturalHeight * scale;

              const labelText = `${obj.label} (${Math.round(obj.confidence * 100)}%)`;
              const labelWidth = Math.max(labelText.length * 7 + 12, 80);

              return (
                <Group
                  key={obj.id}
                  onClick={() => handleBoxClick(obj.id)}
                  onTap={() => handleBoxClick(obj.id)}
                >
                  {/* Bounding box */}
                  <Rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 2}
                    dash={isRejected ? [5, 5] : undefined}
                    opacity={isRejected ? 0.3 : 1}
                    cornerRadius={4}
                  />
                  {/* Label background */}
                  <Rect
                    x={x}
                    y={y - 24}
                    width={labelWidth}
                    height={22}
                    fill={color}
                    opacity={isRejected ? 0.3 : 0.9}
                    cornerRadius={[4, 4, 0, 0]}
                  />
                  {/* Label text */}
                  <Text
                    x={x + 6}
                    y={y - 20}
                    text={labelText}
                    fill="white"
                    fontSize={12}
                    fontStyle="bold"
                    opacity={isRejected ? 0.3 : 1}
                  />
                </Group>
              );
            })}
        </Layer>
      </Stage>
    </div>
  );
}
