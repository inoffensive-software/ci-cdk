import {
  DOC,
  entry,
  fromValue,
  map,
  present,
  seq,
  type Doc,
  type LeafNode,
} from "../core/index.js";
import { variablesDoc } from "./nesting-blocks.js";
import type { DockerOptions, Image, KubernetesOptions, Service, ServiceOptions } from "./types.js";

/** A leaf decides its own style; every other object here is one of the provider's own shapes. */
const isLeaf = (value: Image | Service): value is LeafNode =>
  typeof value === "object" && Object.hasOwn(value, DOC);

/** Docker-executor options, in the docs' order; an absent key keeps the runner's default. */
const dockerOptionsDoc = (options: DockerOptions): Doc =>
  map([...entry("platform", present(options.platform)), ...entry("user", present(options.user))]);

/** Kubernetes-executor options: the user, which GitLab accepts as a string or an integer. */
const kubernetesOptionsDoc = (options: KubernetesOptions): Doc =>
  map([...entry("user", present(options.user))]);

const serviceOptionsDoc = (service: ServiceOptions): Doc =>
  map([
    { key: "name", value: fromValue(service.name) },
    ...entry("alias", present(service.alias)),
    ...entry("docker", service.docker === undefined ? undefined : dockerOptionsDoc(service.docker)),
    ...entry(
      "kubernetes",
      service.kubernetes === undefined ? undefined : kubernetesOptionsDoc(service.kubernetes),
    ),
    ...entry("entrypoint", present(service.entrypoint)),
    ...entry("command", present(service.command)),
    ...entry(
      "variables",
      service.variables === undefined ? undefined : variablesDoc(service.variables),
    ),
    ...entry("pull_policy", present(service.pull_policy)),
  ]);

const serviceDoc = (service: Service): Doc =>
  typeof service === "string" || isLeaf(service) ? fromValue(service) : serviceOptionsDoc(service);

/** One service per entry, in author order; a bare name stays a scalar. */
export const servicesDoc = (services: readonly Service[]): Doc =>
  seq(services.map((item) => serviceDoc(item)));

/** An image keeps its string form; the map form carries `name` first, then the overrides. */
export const imageDoc = (image: Image): Doc =>
  typeof image === "string" || isLeaf(image)
    ? fromValue(image)
    : map([
        { key: "name", value: fromValue(image.name) },
        ...entry("entrypoint", present(image.entrypoint)),
        ...entry("docker", image.docker === undefined ? undefined : dockerOptionsDoc(image.docker)),
        ...entry(
          "kubernetes",
          image.kubernetes === undefined ? undefined : kubernetesOptionsDoc(image.kubernetes),
        ),
        ...entry("pull_policy", present(image.pull_policy)),
      ]);
