import { Button } from "../ui/Button";
import { FieldShell, SelectField } from "../ui/Field";
import { Icon } from "../ui/Icon";
import { Panel } from "../ui/Panel";
import { StatusBadge } from "../ui/StatusBadge";

export function LookPanel({
  background,
  browserFrameVisible,
  onBackgroundChange,
  onPickBackgroundImage,
  onToggleBrowserFrame
}: {
  background: "slate" | "ocean" | "sunset";
  browserFrameVisible: boolean;
  onBackgroundChange: (value: "slate" | "ocean" | "sunset") => void;
  onPickBackgroundImage: () => void;
  onToggleBrowserFrame: (checked: boolean) => void;
}) {
  return (
    <Panel eyebrow="Presentation" title="Look" actions={<StatusBadge tone="neutral">Glass style</StatusBadge>}>
      <FieldShell label="Background preset">
        <SelectField value={background} onChange={(event) => onBackgroundChange(event.target.value as "slate" | "ocean" | "sunset")}>
          <option value="slate">Slate</option>
          <option value="ocean">Ocean</option>
          <option value="sunset">Sunset</option>
        </SelectField>
      </FieldShell>
      <Button type="button" variant="soft" leading={<Icon name="background" />} onClick={onPickBackgroundImage}>
        Pick custom background
      </Button>
      <label className="checkbox-field">
        <input type="checkbox" checked={browserFrameVisible} onChange={(event) => onToggleBrowserFrame(event.target.checked)} />
        <span>Show browser frame</span>
      </label>
    </Panel>
  );
}
