import React from "react";
import { Star } from "lucide-react";

/**
 * RatingStars — displays a 1–5 star rating with filled/unfilled icons.
 *
 * @param {number} rating — value from 0-5
 * @param {number} [size=15] — icon size in px
 */
export default function RatingStars({ rating, size = 15 }) {
  const safeRating = Number(rating || 0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < safeRating;
        return (
          <Star
            key={index}
            size={size}
            className={active ? "text-amber-400" : "text-gray-300"}
            fill={active ? "currentColor" : "none"}
          />
        );
      })}
    </div>
  );
}
