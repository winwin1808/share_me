import { Button } from "../ui/Button";
import { FieldShell, TextField } from "../ui/Field";
import { Panel } from "../ui/Panel";

export function ProjectPanel({
  projectName,
  onProjectNameChange,
  onSave,
  onNew,
  onOpen
}: {
  projectName: string;
  onProjectNameChange: (value: string) => void;
  onSave: () => void;
  onNew: () => void;
  onOpen: () => void;
}) {
  return (
    <Panel eyebrow="Workspace" title="Project" actions={<Button type="button" variant="ghost" onClick={onSave}>Save</Button>}>
      <div className="button-cluster">
        <Button type="button" onClick={onNew}>
          New
        </Button>
        <Button type="button" variant="soft" onClick={onOpen}>
          Open
        </Button>
      </div>
        <FieldShell label="Project name">
          <TextField value={projectName} onChange={(event) => onProjectNameChange(event.target.value)} />
        </FieldShell>
    </Panel>
  );
}
