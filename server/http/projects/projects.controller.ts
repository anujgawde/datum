import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ProjectsService, type DocumentInfo, type ProjectInfo } from "./projects.service.js";

@Controller()
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly service: ProjectsService) {}

  @Get("projects")
  list(): Promise<ProjectInfo[]> {
    return this.service.listProjects();
  }

  @Get("projects/:projectId/documents")
  documents(@Param("projectId") projectId: string): Promise<DocumentInfo[]> {
    return this.service.listDocuments(projectId);
  }
}
