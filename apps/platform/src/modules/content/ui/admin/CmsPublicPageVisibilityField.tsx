"use client";

import { useField, useForm, useFormProcessing } from "@payloadcms/ui";
import { Switch } from "antd";
import { ChevronDown, ChevronRight, LockKeyhole } from "lucide-react";
import type { JSONFieldClientProps } from "payload";
import { useRef, useState } from "react";
import { GeneralButton } from "@/shared/ui/Button";
import {
  normalizePublicPageVisibility,
  publicPageTree,
  type PublicPageNode,
  type PublicPageVisibility,
} from "../../domain/PublicPageVisibility";
import { CmsPageHeader } from "./CmsPageHeader";
import styles from "./CmsPublicPageVisibility.module.css";

type TreeProps = {
  nodes: readonly PublicPageNode[];
  visibility: PublicPageVisibility;
  parentVisible: boolean;
  disabled: boolean;
  change: (key: string, on: boolean) => void;
};

function VisibilityTree(props: TreeProps) {
  return (
    <ul className={styles.tree}>
      {props.nodes.map((node) => (
        <VisibilityNode {...props} key={node.key} node={node} />
      ))}
    </ul>
  );
}

function VisibilityNode({
  node,
  ...props
}: TreeProps & { node: PublicPageNode }) {
  const [expanded, setExpanded] = useState(true);
  const visible =
    props.parentVisible &&
    (node.locked || props.visibility[node.key] !== false);
  const blocked = !props.parentVisible;
  const childrenId = `visibility-${node.key}`;
  return (
    <li>
      <div className={styles.row} data-hidden={!visible || undefined}>
        <div className={styles.label}>
          {node.children?.length ? (
            <GeneralButton
              aria-controls={childrenId}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Collapse" : "Expand"} ${node.label}`}
              className={styles.expand}
              onClick={() => setExpanded(!expanded)}
              type="button"
              variant="ghost"
            >
              {expanded ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </GeneralButton>
          ) : (
            <span className={styles.spacer} />
          )}
          <span>{node.label}</span>
          {node.locked ? (
            <LockKeyhole size={15} aria-label="Always visible" />
          ) : null}
        </div>
        <div className={styles.control}>
          <Switch
            aria-label={`${node.label} visible on public site`}
            checked={Boolean(visible)}
            disabled={props.disabled || blocked || node.locked}
            onChange={(on) => props.change(node.key, on)}
            title={blocked ? "Hidden because a parent is off" : undefined}
          />
          <span>{visible ? "On" : "Off"}</span>
        </div>
      </div>
      {expanded && node.children ? (
        <div id={childrenId} className={styles.children}>
          <VisibilityTree
            {...props}
            nodes={node.children}
            parentVisible={Boolean(visible)}
          />
        </div>
      ) : null}
    </li>
  );
}

export default function CmsPublicPageVisibilityField({
  path,
  readOnly,
}: JSONFieldClientProps) {
  const { value, setValue } = useField<PublicPageVisibility>({ path });
  const { submit, setModified } = useForm();
  const processing = useFormProcessing();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const visibility = normalizePublicPageVisibility(value);

  async function change(key: string, on: boolean) {
    if (saving.current || readOnly) return;
    saving.current = true;
    setBusy(true);
    setError(undefined);
    const next = { ...visibility, [key]: on };
    setValue(next);
    try {
      const result = await submit({
        overrides: { visibility: next },
        disableSuccessStatus: true,
      });
      if (!result?.res.ok)
        throw new Error("Visibility could not be saved. Try again.");
      setModified(false);
    } catch {
      setValue(visibility);
      setModified(false);
      setError("Visibility could not be saved. Try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <section className={styles.content}>
      <CmsPageHeader eyebrow="Website content" title="Public Page Visibility" />
      <p>
        Turning off a parent hides all its children. Changes save automatically.
      </p>
      <div role="status" aria-live="polite" className={styles.feedback}>
        {busy ? "Saving…" : null}
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <div className={styles.panel}>
        <div className={styles.heading}>
          <span>Page / section</span>
          <span>Visible</span>
        </div>
        <VisibilityTree
          nodes={publicPageTree}
          visibility={visibility}
          parentVisible
          disabled={Boolean(readOnly || busy || processing)}
          change={change}
        />
      </div>
    </section>
  );
}
