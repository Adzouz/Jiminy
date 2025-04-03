export interface FileType {
  name: string;
  extension: string;
  size: number;
  fullPath: string;
  isImage: boolean;
  imageType?: string;
}

export interface SelectedItems {
  [key: string]: string[];
}

export interface DoubleType {
  [key: string]: FileType[];
}

export interface HashGroup {
  primaryHash: string;
  files: FileType[];
}
