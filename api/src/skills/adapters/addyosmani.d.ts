/** ============================================================
 *  VIB Capability Protocol v0.1 ↔ addyosmani/agent-skills
 *  — Bidirectional adapter
 *  ============================================================
 *
 *  VIB  uses  a 15-field YAML frontmatter  schema (Capability Protocol).
 *  addyosmani/agent-skills uses a 2-field minimal schema (name + description).
 *  This module converts between them,  emitting non-critical warnings for
 *  fields that have no equivalent in the target format.
 *
 *  Usage:
 *    import { vibToAddyosmani, addyosmaniToVib } from "./addyosmani.js";
 *    const result = vibToAddyosmani(myVibSkill);
 *    console.log(result.warnings);  // 13 unmapped-field warnings
 */
import type { AddyosmaniSkill, VibCapability, ConversionResult } from "./types.js";
/**
 * Convert a full VIB 15-field Capability Protocol skill to addyosmani's
 * 2-field minimal format.  Fields without an addyosmani equivalent are
 * dropped and reported as non-critical warnings.
 */
export declare function vibToAddyosmani(vib: VibCapability): ConversionResult<AddyosmaniSkill>;
/**
 * Convert an addyosmani 2-field minimal skill to VIB's 15-field Capability
 * Protocol format. Missing fields are filled with sensible defaults and
 * reported as non-critical warnings.
 */
export declare function addyosmaniToVib(skill: AddyosmaniSkill): ConversionResult<VibCapability>;
//# sourceMappingURL=addyosmani.d.ts.map