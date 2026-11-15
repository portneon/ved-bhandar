export type TemplateKind = "builder" | "docx";

export interface BuilderConfig {
  schoolName: string;
  headerText: string;
  footerText: string;
  showBloom: boolean;
  showMarks: boolean;
}

export class Template {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public name: string,
    public readonly kind: TemplateKind,
    public readonly builderConfig: BuilderConfig | null,
    public readonly docxStoragePath: string | null,
    public readonly createdAt: Date,
  ) {}
}
