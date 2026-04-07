import React from "react";
import { Upload } from "react-feather";

export default function DownloadIcon({ size = 16, style, ...props }) {
  const mergedStyle = { ...style, transform: "rotate(180deg)" };
  return <Upload size={size} style={mergedStyle} {...props} />;
}

