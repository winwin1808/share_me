import { Button } from "../ui/Button";
import { FieldShell, TextField } from "../ui/Field";
import { Icon, IconButton } from "../ui/Icon";
import { Panel } from "../ui/Panel";
import { StatusBadge } from "../ui/StatusBadge";

export function ProjectPanel({
  projectName,
  saveState,
  saveError,
  onProjectNameChange,
  onSave,
  onNew,
  onOpen
}: {
  projectName: string;
  saveState: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  onProjectNameChange: (value: string) => void;
  onSave: () => void;
  onNew: () => void;
  onOpen: () => void;
}) {
  return (
    <Panel
      eyebrow="Workspace"
      title="Project"
      actions={
        <>
          <StatusBadge tone={saveState === "error" ? "danger" : saveState === "saved" ? "success" : "neutral"}>
            {saveState}
          </StatusBadge>
          <IconButton label="Save project" icon="save" onClick={onSave} disabled={saveState === "saving"} />
        </>
      }
    >
      <div className="button-cluster">
        <Button type="button" leading={<Icon name="add" />} onClick={onNew}>
          New
        </Button>
        <Button type="button" variant="soft" leading={<Icon name="folder-open" />} onClick={onOpen}>
          Open
        </Button>
      </div>
      <FieldShell label="Project name">
        <TextField value={projectName} onChange={(event) => onProjectNameChange(event.target.value)} />
      </FieldShell>
      {saveError && <p className="panel-error">{saveError}</p>}
    </Panel>
  );
}
